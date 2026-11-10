import { expect, test } from "vitest";
import { DOOR_STEP, stairwellGround } from "../building/stairwell";
import { footCapsule } from "../characters/skeleton";
import { TIBIK_FOOT, sunkSoles } from "../scenes/drawnSoles";
import {
  karenGait,
  tibikGait as hausmuellTibik,
} from "../scenes/hausmuell/choreography";
import {
  PAPIERTONNEN_DURATION,
  tibikGait as papiertonnenTibik,
} from "../scenes/papiertonnen/choreography";
import { solvePapiertonnen } from "../scenes/papiertonnen/solve";
import { TREPPENHAUS_DURATION } from "../scenes/treppenhaus/cameras";
import { solveTreppenhaus } from "../scenes/treppenhaus/solve";
import { RIG } from "../Tibik/rig";
import { HAUSTUER } from "./facade";
import { reachOver } from "./footprint";
import {
  ENTRANCE_MAT,
  ENTRANCE_STEP,
  entranceGround,
  entranceMatRect,
} from "./layout";

const STEP_TOP = ENTRANCE_STEP.center[1] + ENTRANCE_STEP.size[1] / 2;
const step = {
  x0: ENTRANCE_STEP.center[0] - ENTRANCE_STEP.size[0] / 2,
  x1: ENTRANCE_STEP.center[0] + ENTRANCE_STEP.size[0] / 2,
  z0: ENTRANCE_STEP.center[2] - ENTRANCE_STEP.size[2] / 2,
  z1: ENTRANCE_STEP.center[2] + ENTRANCE_STEP.size[2] / 2,
};

test("the walking ground at the door is the step as drawn: its top over it, the pavement just past its outer edges", () => {
  expect([DOOR_STEP.x0, DOOR_STEP.x1, DOOR_STEP.z0, DOOR_STEP.z1]).toEqual([
    step.x0,
    step.x1,
    step.z0,
    step.z1,
  ]);
  expect(DOOR_STEP.top).toBe(STEP_TOP);
  const mid = (step.z0 + step.z1) / 2;
  expect(stairwellGround(step.x0, mid)).toBe(STEP_TOP);
  expect(stairwellGround(step.x1, step.z1)).toBe(STEP_TOP);
  expect(stairwellGround(step.x0 - 1e-6, mid)).toBe(0);
  expect(stairwellGround(step.x1 + 1e-6, mid)).toBe(0);
  expect(stairwellGround((step.x0 + step.x1) / 2, step.z1 + 1e-6)).toBe(0);
});

test("a 60 x 40 cm recessed mat lies in the step in front of the Haustür, framed by at least 4 cm of step all round", () => {
  const r = entranceMatRect();
  expect([r.x1 - r.x0, r.z1 - r.z0].map((v) => +v.toFixed(3))).toEqual([
    0.6, 0.4,
  ]);
  for (const margin of [
    r.x0 - step.x0,
    step.x1 - r.x1,
    r.z0 - step.z0,
    step.z1 - r.z1,
  ])
    expect(margin).toBeGreaterThanOrEqual(0.04);
  const doorCentre = HAUSTUER.hinge[0] + HAUSTUER.width / 2;
  expect(Math.abs((r.x0 + r.x1) / 2 - doorCentre)).toBeLessThan(0.05);
});

test("it is flush: its face sits at most 1 mm over the step top and the ground there stays the step", () => {
  const r = entranceMatRect();
  expect(r.y).toBeGreaterThan(STEP_TOP);
  expect(r.y - STEP_TOP).toBeLessThanOrEqual(0.001 + 1e-12);
  expect(ENTRANCE_MAT.frame).toBeGreaterThan(0);
  expect(ENTRANCE_MAT.frame).toBeLessThan(0.04);
  for (const [x, z] of [
    [r.x0, r.z0],
    [r.x1, r.z1],
    [(r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2],
  ])
    expect(stairwellGround(x, z)).toBeCloseTo(STEP_TOP, 9);
});

test("the entrance ground is the pavement, the step's top over the step, and the mat's face over the mat", () => {
  const r = entranceMatRect();
  expect(entranceGround((r.x0 + r.x1) / 2, (r.z0 + r.z1) / 2)).toBe(
    Math.max(STEP_TOP, r.y),
  );
  expect(entranceGround(step.x0 + 0.01, (step.z0 + step.z1) / 2)).toBe(STEP_TOP);
  expect(entranceGround(step.x0 - 0.5, step.z1 + 0.5)).toBe(0);
});


test(
  "walking out over it, Tibik's drawn soles, outline included, never dip below the mat's face",
  { timeout: 300_000 },
  () => {
    const problems = [
      ...sunkSoles(
        TIBIK_FOOT,
        (t) => ({ ...solveTreppenhaus(t).tibik, skeleton: RIG }),
        0,
        TREPPENHAUS_DURATION,
        entranceGround,
      ),
      ...sunkSoles(
        TIBIK_FOOT,
        (t) => ({ ...solvePapiertonnen(t).tibik, skeleton: RIG }),
        0,
        PAPIERTONNEN_DURATION,
        entranceGround,
      ),
    ];
    expect(problems.slice(0, 6)).toEqual([]);
    const r = entranceMatRect();
    const plantsOnMat = (plan: ReturnType<typeof papiertonnenTibik>) =>
      [...plan.plants.leftLeg, ...plan.plants.rightLeg].filter((p) =>
        reachOver(p.ankle.x, p.ankle.z, 0, r),
      ).length;
    expect(plantsOnMat(papiertonnenTibik()), "Papiertonnen").toBeGreaterThan(0);
  },
);

test("in the Hausmuell argument nobody plants a foot within 30 cm of the mat", () => {
  const r = entranceMatRect();
  for (const plan of [hausmuellTibik(), karenGait()])
    for (const leg of ["leftLeg", "rightLeg"] as const)
      for (const plant of plan.plants[leg]) {
        const { toe, radius } = footCapsule(plan.skeleton, plant.side);
        const reach = toe[2] + radius + 0.3;
        const { x, z } = plant.ankle;
        expect(reachOver(x, z, reach, r)).toBe(false);
      }
});
