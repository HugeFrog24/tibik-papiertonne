import { expect, test } from "vitest";
import {
  FISHEYE,
  barrel,
  distortUv,
  canvasPixels,
  colourSamples,
  insideLens,
  lensPoint,
  unbarrel,
  undistortUv,
} from "./fisheye";
import { aboveTheBar } from "../dialogue/subtitles";
import { FORMATS, type Format } from "../frameRate";

test("the centre of the lens doesn't move", () => {
  expect(barrel([0, 0], FISHEYE.halfAngle)).toEqual([0, 0]);
});

test("distortion grows with distance from the centre and keeps direction", () => {
  let before = 0;
  for (let r = 0.1; r < 0.95; r += 0.1) {
    const [x, y] = barrel([r, 0], FISHEYE.halfAngle);
    const length = Math.hypot(x, y);
    expect(length).toBeGreaterThan(before);
    expect(length).toBeLessThan(r);
    before = length;
  }
  const [x, y] = barrel([0.3, 0.4], FISHEYE.halfAngle);
  expect(x * 0.4 - y * 0.3).toBeCloseTo(0, 12);
  expect(x * 0.3 + y * 0.4).toBeGreaterThan(0);
});

test("the frame is round", () => {
  expect(insideLens([0.75, 0.75])).toBe(false);
  expect(insideLens([0.6, 0.6])).toBe(true);
});

test("the render target follows the canvas size", () => {
  expect(canvasPixels(1920, 1080, 1)).toEqual([1920, 1080]);
  expect(canvasPixels(960, 540, 2)).toEqual([1920, 1080]);
});

test("through the door viewer the scene renders at twice the canvas's pixels, so the viewer's enlarged centre stays sharp", () => {
  expect(canvasPixels(1920, 1080, 1, true)).toEqual([3840, 2160]);
  expect(canvasPixels(1080, 1920, 1, false)).toEqual([1080, 1920]);
});

test("at 8K the door viewer renders past the canvas's pixels but holds at most two 8K frames' worth (10861 x 6109): at twice the canvas each way its 32-bit id buffer (15360 x 8640, 2 GB) silently fails to allocate and the shot loses every outline found by edges; never past the largest texture the GPU takes; 1080p and 4K keep twice the canvas", () => {
  expect(canvasPixels(1920, 1080, 4, true, 16384)).toEqual([10861, 6109]);
  expect(canvasPixels(1080, 1920, 4, true, 16384)).toEqual([6109, 10861]);
  expect(canvasPixels(1920, 1080, 8, true, 16384)).toEqual([10861, 6109]);
  expect(canvasPixels(1920, 1080, 4, true, 8192)).toEqual([8192, 4608]);
  const [w, h] = canvasPixels(1920, 1080, 4, true, 16384);
  expect(w * h * 16).toBeLessThan(2 ** 30 * 1.05);
  expect(canvasPixels(1920, 1080, 2, true, 16384)).toEqual([7680, 4320]);
  expect(canvasPixels(1080, 1920, 2, true, 16384)).toEqual([4320, 7680]);
  expect(canvasPixels(1920, 1080, 1, true, 16384)).toEqual([3840, 2160]);
  expect(canvasPixels(1920, 1080, 4, false, 16384)).toEqual([7680, 4320]);
  expect(canvasPixels(1080, 1920, 4, false, 16384)).toEqual([4320, 7680]);
});

test("the buffer a shot is drawn into before inking keeps its 4x multisampling up to an 8K frame's worth of pixels, so every shot at 1080p and 4K and every 8K shot outside the door viewer looks as before; the viewer's doubled 8K buffer would not fit the GPU with it (black frame), and its extra pixels smooth its edges instead", () => {
  expect(colourSamples(canvasPixels(1920, 1080, 1, true))).toBe(4);
  expect(colourSamples(canvasPixels(1920, 1080, 2, true))).toBe(4);
  expect(colourSamples(canvasPixels(1080, 1920, 2, true))).toBe(4);
  expect(colourSamples(canvasPixels(1920, 1080, 4))).toBe(4);
  expect(colourSamples(canvasPixels(1080, 1920, 4))).toBe(4);
  expect(colourSamples(canvasPixels(1920, 1080, 4, true, 16384))).toBe(0);
  expect(colourSamples(canvasPixels(1080, 1920, 4, true, 16384))).toBe(0);
});

test("on a wide frame the lens is round in pixels and samples stay on screen", () => {
  const aspect = 1920 / 1080;
  expect(distortUv([0.5, 0.5], aspect, FISHEYE.halfAngle)).toEqual([0.5, 0.5]);
  const rim = lensPoint([0.5 + 540 / 1920, 0.5], aspect);
  expect(Math.hypot(rim[0], rim[1])).toBeCloseTo(1, 12);
  const top = lensPoint([0.5, 1], aspect);
  expect(Math.hypot(top[0], top[1])).toBeCloseTo(1, 12);
  for (const u of [0.25, 0.4, 0.6, 0.75])
    for (const v of [0.05, 0.5, 0.95]) {
      if (!insideLens(lensPoint([u, v], aspect))) continue;
      const [su, sv] = distortUv([u, v], aspect, FISHEYE.halfAngle);
      expect(su).toBeGreaterThanOrEqual(0);
      expect(su).toBeLessThanOrEqual(1);
      expect(sv).toBeGreaterThanOrEqual(0);
      expect(sv).toBeLessThanOrEqual(1);
    }
});

test("on a square frame the shader's mapping is barrel()", () => {
  const [su, sv] = distortUv([0.8, 0.3], 1, FISHEYE.halfAngle);
  const [bx, by] = barrel([0.6, -0.4], FISHEYE.halfAngle);
  expect(su).toBeCloseTo(bx * 0.5 + 0.5, 12);
  expect(sv).toBeCloseTo(by * 0.5 + 0.5, 12);
});

test("unbarrel undoes barrel, so a point in the scene can be found in the lens", () => {
  for (const p of [
    [0, 0],
    [0.3, 0.1],
    [-0.5, 0.6],
    [0.05, -0.9],
  ] as const) {
    const back = barrel(unbarrel(p, FISHEYE.halfAngle), FISHEYE.halfAngle);
    expect(back[0]).toBeCloseTo(p[0], 9);
    expect(back[1]).toBeCloseTo(p[1], 9);
  }
});

test("a point placed through the lens samples itself back", () => {
  const aspect = 1920 / 1080;
  const [u, v] = undistortUv([0.62, 0.41], aspect, FISHEYE.halfAngle);
  const [su, sv] = distortUv([u, v], aspect, FISHEYE.halfAngle);
  expect(su).toBeCloseTo(0.62, 9);
  expect(sv).toBeCloseTo(0.41, 9);
});

test("the lens circle fits the frame's shorter side: the height in 16:9, the width in 9:16, so a peephole stays round in both", () => {
  const [wide, tall] = [16 / 9, 9 / 16];
  expect(lensPoint([0.5, 0], wide)).toEqual([0, -1]);
  expect(insideLens(lensPoint([0, 0.5], wide))).toBe(false);
  expect(lensPoint([0, 0.5], tall)[0]).toBeCloseTo(-1, 12);
  expect(insideLens(lensPoint([0.5, 0], tall))).toBe(false);
  for (const aspect of [wide, tall]) {
    const uv: [number, number] = [0.3, 0.6];
    const back = distortUv(undistortUv(uv, aspect, FISHEYE.halfAngle), aspect, FISHEYE.halfAngle);
    expect(back[0]).toBeCloseTo(uv[0], 6);
    expect(back[1]).toBeCloseTo(uv[1], 6);
  }
});

test("a 160-degree door viewer: the rim of its circle sees 80 degrees off the axis, and the angle seen grows evenly from the centre to the rim", () => {
  expect((FISHEYE.halfAngle * 180) / Math.PI).toBeCloseTo(80, 9);
  for (let r = 0.1; r <= 1.0001; r += 0.1) {
    const [x] = barrel([r, 0], FISHEYE.halfAngle);
    expect(Math.atan(x * Math.tan(FISHEYE.halfAngle))).toBeCloseTo(r * FISHEYE.halfAngle, 9);
    expect(unbarrel(barrel([r, 0], FISHEYE.halfAngle), FISHEYE.halfAngle)[0]).toBeCloseTo(r, 9);
  }
});

test("in 9:16 the round viewer sits a little above the frame's middle, and a point placed through it still samples itself back", () => {
  const tall = 9 / 16;
  const raise = FISHEYE.raise.tall;
  const middle: [number, number] = [0.5, 0.5 + (raise * tall) / 2];
  expect(lensPoint(middle, tall, raise)[1]).toBeCloseTo(0, 12);
  expect(distortUv(middle, tall, FISHEYE.halfAngle, raise)[1]).toBeCloseTo(0.5, 12);
  const uv: [number, number] = [0.4, 0.62];
  const back = distortUv(undistortUv(uv, tall, FISHEYE.halfAngle, raise), tall, FISHEYE.halfAngle, raise);
  expect(back[0]).toBeCloseTo(uv[0], 9);
  expect(back[1]).toBeCloseTo(uv[1], 9);
  expect(FISHEYE.raise.wide).toBe(0);
});

test("the subtitle bar crosses the round viewer at the same height in 9:16 as in 16:9, so it never covers more of a face there", () => {
  const crossing = (format: Format) => {
    const { width, height } = FORMATS[format];
    const radius = Math.min(width, height) / 2;
    return aboveTheBar(format) * height - (height / 2 - FISHEYE.raise[format] * radius);
  };
  expect(Math.abs(crossing("tall") - crossing("wide"))).toBeLessThan(2);
});
