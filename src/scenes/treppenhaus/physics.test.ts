import { Vector3 } from "three";
import { expect, test } from "vitest";
import { FLIGHTS, stairwellGround } from "../../building/stairwell";
import { footCapsule } from "../../characters/skeleton";
import { collide, sphere } from "../../physics/collision";
import { RIG } from "../../Tibik/rig";
import { SHOTS, TREPPENHAUS_DURATION, cameraAt, storyTime } from "./cameras";
import { RAIL_SPAN, STORY_END, treppenhausTibikGait } from "./choreography";
import { railGap, solveTreppenhaus, treppenhausSolids, treppenhausViolations } from "./solve";

const FPS = 30;
const TOLERANCE = 0.005;
const storyFrames = Array.from({ length: Math.floor(STORY_END * FPS) + 1 }, (_, f) => f / FPS);
const filmFrames = Array.from({ length: Math.round(TREPPENHAUS_DURATION * FPS) }, (_, f) => f / FPS);

test("treppenhaus: nothing passes through anything, in any frame", { timeout: 300_000 }, () => {
  const problems = storyFrames.flatMap((t) =>
    treppenhausViolations(solveTreppenhaus(t))
      .filter((c) => c.depth > TOLERANCE)
      .map((c) => `${t.toFixed(2)} s: ${c.a} is ${(c.depth * 1000).toFixed(0)} mm inside ${c.b}`),
  );
  expect(problems.slice(0, 12)).toEqual([]);
});

test("his hand slides along the handrail on the way down", { timeout: 300_000 }, () => {
  const problems: string[] = [];
  for (let t = RAIL_SPAN[0]; t <= RAIL_SPAN[1]; t += 1 / FPS) {
    const gap = railGap(solveTreppenhaus(t));
    if (Math.abs(gap) > TOLERANCE) problems.push(`${t.toFixed(2)} s: hand ${(gap * 1000).toFixed(0)} mm from the rail`);
  }
  expect(problems.slice(0, 12)).toEqual([]);
});

test("on the flight, every foot stands on its own tread, mostly on it", () => {
  const eg = FLIGHTS[0];
  const problems: string[] = [];
  const { heel, toe, radius } = footCapsule(RIG, 1);
  for (const leg of ["leftLeg", "rightLeg"] as const) {
    for (const plant of treppenhausTibikGait().plants[leg]) {
      const { x, z } = plant.ankle;
      const onFlight = (z - eg.firstRiser) * eg.direction > 0 && (z - eg.firstRiser - eg.direction * (eg.risers - 1) * eg.going) * eg.direction < 0;
      if (!onFlight) continue;
      const tread = stairwellGround(x, z);
      const forward = Math.cos(plant.yaw);
      const heights = Array.from({ length: 21 }, (_, i) => stairwellGround(x, z + forward * (heel[2] - radius + ((toe[2] - heel[2] + 2 * radius) * i) / 20)));
      const supported = heights.filter((y) => Math.abs(y - tread) < 1e-9).length / heights.length;
      if (supported < 0.7) problems.push(`${leg} at z ${z.toFixed(2)}: only ${(supported * 100).toFixed(0)}% on its tread`);
      if (heights.some((y) => y > tread + 1e-9)) problems.push(`${leg} at z ${z.toFixed(2)}: heel against the riser`);
    }
  }
  expect(problems).toEqual([]);
});

test("cameras never sit inside or against a wall", { timeout: 300_000 }, () => {
  const problems: string[] = [];
  for (const filmT of filmFrames) {
    const setup = cameraAt(filmT);
    const probe = sphere("camera", new Vector3(...setup.position), 0.05);
    for (const solid of treppenhausSolids(solveTreppenhaus(storyTime(filmT)))) {
      if (collide(probe, solid)) problems.push(`${filmT.toFixed(2)} s: camera against ${solid.name}`);
    }
  }
  expect(problems.slice(0, 8)).toEqual([]);
});

test("frames solved in any order give the same result", { timeout: 300_000 }, () => {
  const sample = storyFrames.filter((_, i) => i % 15 === 0);
  const forwards = sample.map((t) => solveTreppenhaus(t));
  solveTreppenhaus.clear();
  const backwards = [...sample].reverse().map((t) => solveTreppenhaus(t)).reverse();
  expect(JSON.stringify(backwards)).toEqual(JSON.stringify(forwards));
});

test("the film never shows a story moment twice, and plays each shot at normal speed", () => {
  let before = -Infinity;
  for (const filmT of filmFrames) {
    const t = storyTime(filmT);
    expect(t).toBeGreaterThan(before);
    before = t;
  }
  for (const shot of SHOTS) {
    expect(storyTime(shot.to - 1e-6) - storyTime(shot.from)).toBeCloseTo(shot.to - 1e-6 - shot.from, 6);
  }
  expect(storyTime(TREPPENHAUS_DURATION - 1 / FPS)).toBeLessThanOrEqual(STORY_END);
});
