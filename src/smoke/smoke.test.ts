import { Matrix4, Vector3 } from "three";
import { expect, test } from "vitest";
import { obb, sphereObbGap, boxGap } from "../physics/collision";
import { SMOKE, curlExtent, curlsAt, type SmokeSource } from "./smoke";

const flat = (t: number) => t;
const UP_FROM_ORIGIN: SmokeSource = {
  name: "test plume",
  kind: "exhale",
  windows: [[0, 0.5]],
  origin: () => new Vector3(0, 0, 0),
  direction: () => new Vector3(0, 1, 0),
};
const CEILING = obb("ceiling", new Matrix4().setPosition(0, 0.45, 0), [3, 0.1, 3]);

test("the same frame gives the same curls whether or not other frames were computed first", () => {
  const scene = { storyAt: flat, sources: [UP_FROM_ORIGIN], solids: [CEILING] };
  const fresh = curlsAt(1.2, scene);
  curlsAt(1.1, scene);
  curlsAt(1.3, scene);
  expect(curlsAt(1.2, scene)).toEqual(fresh);
});

test("curls that reach a ceiling stop below it and spread flat", () => {
  const curls = curlsAt(2.0, { storyAt: flat, sources: [UP_FROM_ORIGIN], solids: [CEILING] });
  expect(curls.length).toBeGreaterThan(5);
  expect(curls.some((c) => c.flat > 0.5)).toBe(true);
  for (const curl of curls) expect(boxGap(curlExtent(curl), CEILING), JSON.stringify(curl.center)).toBeGreaterThanOrEqual(-1e-6);
});

test("each curl grows, fades out within its life of 2-4 s and is gone after it", () => {
  expect(SMOKE.life.wisp).toBeGreaterThanOrEqual(2);
  expect(SMOKE.life.exhale).toBeLessThanOrEqual(4);
  const born = curlsAt(0.05, { storyAt: flat, sources: [UP_FROM_ORIGIN], solids: [] })[0];
  const older = curlsAt(1.05, { storyAt: flat, sources: [UP_FROM_ORIGIN], solids: [] })[0];
  expect(older.radius).toBeGreaterThan(born.radius);
  const late = curlsAt(SMOKE.life.exhale - 0.01, { storyAt: flat, sources: [UP_FROM_ORIGIN], solids: [] })[0];
  expect(late.opacity).toBeLessThan(0.05);
  expect(curlsAt(SMOKE.life.exhale + 0.6, { storyAt: flat, sources: [UP_FROM_ORIGIN], solids: [] })).toEqual([]);
});

test("a curl is ink-free and stays out of a body it drifts into", () => {
  const head = { kind: "sphere" as const, name: "head", center: new Vector3(0, 0.3, 0), radius: 0.12 };
  const curls = curlsAt(1.5, { storyAt: flat, sources: [UP_FROM_ORIGIN], solids: [], bodies: () => [head] });
  for (const curl of curls) expect(sphereObbGap(head, curlExtent(curl))).toBeGreaterThanOrEqual(-1e-6);
});

test("a body never pushes a curl back into a wall: after every push the curl is clear of both", () => {
  const wall = obb("wall", new Matrix4().setPosition(0.12, 0.3, 0), [0.04, 2, 2]);
  const head = { kind: "sphere" as const, name: "body", center: new Vector3(-0.02, 0.25, 0), radius: 0.16 };
  const curls = curlsAt(1.5, { storyAt: flat, sources: [UP_FROM_ORIGIN], solids: [wall], bodies: () => [head] });
  expect(curls.length).toBeGreaterThan(3);
  for (const curl of curls) expect(boxGap(curlExtent(curl), wall), JSON.stringify(curl.center)).toBeGreaterThanOrEqual(-1e-6);
});

const JUMP = 4;
const SKIP = 100;
const jumping = {
  storyAt: (t: number) => (t < JUMP ? t : t + SKIP),
  filmAt: (s: number) => (s < JUMP ? s : s < JUMP + SKIP ? JUMP : s - SKIP),
};
const STEADY: SmokeSource = { name: "test wisp", kind: "wisp", windows: [[0, 9]], origin: () => new Vector3(0, 0, 0) };

test("a source that runs on through a time jump keeps its plume: just after the jump as many curls hang in the air as just before", () => {
  const scene = { ...jumping, sources: [STEADY], solids: [] };
  const before = curlsAt(JUMP - 0.01, scene);
  const after = curlsAt(JUMP, scene);
  expect(before.length).toBeGreaterThan(10);
  expect(Math.abs(after.length - before.length)).toBeLessThanOrEqual(1);
  for (const curl of after) expect(curl.born).toBeGreaterThanOrEqual(JUMP);
});

test("a body only pushes the curls it meets: one that steps into the plume's path later leaves the curls that passed before it came alone", () => {
  const scene = { storyAt: flat, sources: [UP_FROM_ORIGIN], solids: [] };
  const comesLate = { kind: "sphere" as const, name: "late body", center: new Vector3(0, 0.05, 0.02), radius: 0.03 };
  const without = curlsAt(1.5, scene);
  const withLateBody = curlsAt(1.5, { ...scene, bodies: (t: number) => (t < 1.45 ? [] : [comesLate]) });
  const passedEarly = (c: { born: number }) => c.born < 0.5;
  expect(without.filter(passedEarly).length).toBeGreaterThan(3);
  expect(withLateBody.filter(passedEarly)).toEqual(without.filter(passedEarly));
});
