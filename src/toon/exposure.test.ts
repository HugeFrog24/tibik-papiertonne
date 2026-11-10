import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { SHUTTER, exposureOf } from "./exposure";
import type { CameraSetup } from "./shots";

const moving = (t: number): CameraSetup => ({ position: [t, 1.5, 0], target: [t, 1.5, -3], fov: 50 });

test("a camera holding still is exposed once, so a still frame costs one render", () => {
  const still = (): CameraSetup => ({ position: [0, 1.5, 0], target: [0, 1.5, -3], fov: 50 });
  expect(exposureOf(still, 2, 30)).toEqual([still()]);
});

test("a moving camera is exposed at evenly spread moments across a 180 degree shutter that closes at the frame", () => {
  const poses = exposureOf(moving, 2, 30);
  expect(SHUTTER.angle).toBe(180);
  expect(poses).toHaveLength(SHUTTER.samples);
  const times = poses.map((p) => p.position[0]);
  const open = 1 / 60;
  times.forEach((t, i) => { expect(t).toBeCloseTo(2 - open + (open * (i + 0.5)) / SHUTTER.samples, 12); });
  expect(Math.max(...times)).toBeLessThan(2);
  expect(Math.min(...times)).toBeGreaterThan(2 - open);
});

test("every pose's share of a blurred frame is a power of two, so in the half-float sum an opaque pixel adds up to exactly 1 and the sky never shows through it", () => {
  expect(Number.isInteger(Math.log2(SHUTTER.samples))).toBe(true);
  expect(SHUTTER.samples).toBeGreaterThanOrEqual(4);
});

test("the camera rig hands the exposure to the ink pass and takes it back when its shot ends, so a later camera is never steered by an old shot's poses", () => {
  const rig = readFileSync(path.join("src", "toon", "primitives.tsx"), "utf8").replace(/\s+/g, " ");
  expect(rig).toContain("setExposure(camera, exposure);");
  expect(rig).toMatch(/return \(\) => \{ setExposure\(camera, undefined\); \};/);
  const pass = readFileSync(path.join("src", "toon", "InkPass.tsx"), "utf8");
  expect(pass).toContain("exposureOn(camera)");
  expect(pass).not.toContain("userData.exposure");
  expect(pass).toMatch(/blendSrc: OneFactor/);
  expect(pass).toContain('uniforms["weight"].value = 1 / poses.length');
});

test("the ink pass draws the shadow maps once a frame: its id pass and every further pose of a blurred frame reuse them", () => {
  const pass = readFileSync(path.join("src", "toon", "InkPass.tsx"), "utf8").replace(/\s+/g, " ");
  expect(pass).toMatch(/withShadowsKept\(gl, \(\) => \{ gl\.setRenderTarget\(ids\); gl\.render\(scene, camera\);/);
  expect(pass).toMatch(/if \(i === 0\) draw\(\); else withShadowsKept\(gl, draw\);/);
});

test("a shot that asks for blur gets its camera's exposure from the shot cameras", () => {
  const cameras = readFileSync(path.join("src", "toon", "ShotCameras.tsx"), "utf8");
  expect(cameras).toMatch(/shot\.blur \? exposureOf\(/);
});
