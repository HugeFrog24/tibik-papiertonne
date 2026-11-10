import { readFileSync } from "node:fs";
import { SphereGeometry, Vector3 } from "three";
import { expect, test } from "vitest";
import { EYE, HIGHLIGHT, IRIS_DISC } from "../Karen/eyeShape";
import { RIG } from "../Tibik/rig";
import { CATCHLIGHT_SEGMENTS, catchlightCap, type CatchlightSpec } from "./catchlight";

const capPoints = (sphere: number, spec: CatchlightSpec) => {
  const cap = catchlightCap(sphere, spec);
  const geometry = new SphereGeometry(cap.radius, ...CATCHLIGHT_SEGMENTS, 0, 2 * Math.PI, 0, cap.angle).applyQuaternion(cap.quaternion);
  const position = geometry.getAttribute("position");
  return Array.from({ length: position.count }, (_, i) => new Vector3().fromBufferAttribute(position, i));
};

const EVERY_CATCHLIGHT: readonly (readonly [number, CatchlightSpec])[] = [
  ...RIG.eye.catchlights.map((spec) => [RIG.eye.pupil.radius, spec] as const),
  [EYE.radius, HIGHLIGHT],
];

test("eye catchlights are flat patches lying on the eye, not bumps: every point sits within half a millimetre above the surface", () => {
  for (const [sphere, spec] of EVERY_CATCHLIGHT) {
    for (const p of capPoints(sphere, spec)) {
      expect(p.length()).toBeGreaterThan(sphere);
      expect(p.length() - sphere).toBeLessThan(0.0005);
    }
  }
  for (const file of ["src/Tibik/Tibik.tsx", "src/Karen/Karen.tsx"]) {
    const source = readFileSync(file, "utf8");
    expect(source, file).toMatch(/<Catchlight /);
    expect(source, file).not.toMatch(/sphereGeometry args=\{\[(0\.00[49]|r \* HIGHLIGHT)/);
  }
});

test("each catchlight keeps the size of the highlight it replaces and points where it did", () => {
  const cap = (sphere: number, spec: CatchlightSpec) => catchlightCap(sphere, spec);
  const [big, small] = RIG.eye.catchlights;
  expect(Math.sin(cap(RIG.eye.pupil.radius, big).angle) * RIG.eye.pupil.radius).toBeCloseTo(0.009, 3);
  expect(Math.sin(cap(RIG.eye.pupil.radius, small).angle) * RIG.eye.pupil.radius).toBeCloseTo(0.004, 3);
  expect(Math.sin(cap(EYE.radius, HIGHLIGHT).angle)).toBeCloseTo(0.17, 6);
  const up = new Vector3(0, 1, 0).applyQuaternion(cap(EYE.radius, HIGHLIGHT).quaternion);
  expect(up.angleTo(new Vector3(0.38, 0.46, 0.8))).toBeLessThan(1e-6);
});

test("Tibik's catchlights lie on the part of his pupil that shows, clear of the iris and the eyeball", () => {
  const pupil = new Vector3(0, 0, RIG.eye.pupil.offset);
  const iris = new Vector3(0, 0, RIG.eye.iris.offset);
  for (const spec of RIG.eye.catchlights) {
    for (const p of capPoints(RIG.eye.pupil.radius, spec)) {
      const at = p.add(pupil);
      expect(at.distanceTo(iris)).toBeGreaterThan(RIG.eye.iris.radius);
      expect(at.length()).toBeGreaterThan(RIG.eye.radius);
    }
  }
});

test("Karen's catchlight lies above her iris disc and under her lids", () => {
  const { radius } = catchlightCap(EYE.radius, HIGHLIGHT);
  expect(radius).toBeGreaterThan(EYE.radius * IRIS_DISC.lift);
  expect(radius).toBeLessThan(EYE.radius * EYE.lid);
});
