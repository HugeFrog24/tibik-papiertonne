import { expect, test } from "vitest";
import { RIG } from "../Tibik/rig";
import { footCapsule } from "./skeleton";
import { restAnkle } from "./legs";
import { TIBIK_GAIT } from "../Tibik/character";
import {
  STEP_OVERLAP,
  offTheEdges,
  planGait,
  rhythmicSteps,
  soleSamples,
  type Ground,
  type RootAt,
} from "./gait";

const STEP_TOP = 0.15;
const onTheStep: Ground = (_x, z) => (z < 0 ? STEP_TOP : 0);
const walkingUp: RootAt = (t) => {
  const z = 1.2 - 0.9 * Math.min(Math.max(t, 0), 2.4);
  return { x: 0, z, yaw: Math.PI, y: z < 0 ? STEP_TOP : 0 };
};
const SPAN = [0, 3] as const;
const steps = rhythmicSteps({
  from: 0,
  to: 2.4,
  first: 1,
  cadence: () => 1.9,
  overlap: STEP_OVERLAP,
});

test("a walk whose plants fall across a step edge is refused as planned", () => {
  expect(() =>
    planGait(RIG, TIBIK_GAIT, walkingUp, steps, SPAN, onTheStep),
  ).toThrow(/inside the ground/);
});

test("off the edges, every foot plant of that walk stands wholly on one level, moved along the walk by less than a foot", () => {
  const cleared = offTheEdges(RIG, TIBIK_GAIT, walkingUp, steps, SPAN, onTheStep);
  expect(cleared.length).toBe(steps.length);
  expect(cleared.some((s) => s.at)).toBe(true);
  const plan = planGait(RIG, TIBIK_GAIT, walkingUp, cleared, SPAN, onTheStep);
  const footLength = 2 * RIG.foot.size[2];
  for (const plant of [...plan.plants.leftLeg, ...plan.plants.rightLeg]) {
    const fx = Math.sin(plant.yaw);
    const fz = Math.cos(plant.yaw);
    const heights = soleSamples(RIG, plant.side).map(({ along, across }) =>
      onTheStep(plant.ankle.x + fx * along + fz * across, plant.ankle.z + fz * along - fx * across),
    );
    expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(0.001);
  }
  cleared.forEach((s, i) => {
    if (!s.at) return;
    expect(Math.abs(s.at.x - 0)).toBeLessThan(RIG.foot.size[0] * 4);
    expect(steps[i].at).toBeUndefined();
  });
  const moved = cleared.filter((s) => s.at).map((s) => s.at!.z);
  for (const z of moved) expect(Math.abs(z)).toBeLessThan(footLength + 0.05);
});

test("a foot whose rounded heel only overhangs a doormat's edge stands, not sinks", () => {
  const { heel, radius } = footCapsule(RIG, 1);
  const landing = -0.3;
  const behindTheHeel = landing + (radius - heel[2]);
  const mat: Ground = (_x, z) => (z > behindTheHeel - radius / 2 ? 0.001 : 0);
  const standing: RootAt = () => ({ x: 0, z: 0, yaw: Math.PI });
  const step = { side: 1 as const, lift: 0.2, land: 0.6, at: { x: -restAnkle(RIG, 1).x, z: landing } };
  expect(() => planGait(RIG, TIBIK_GAIT, standing, [step], [0, 1], mat)).not.toThrow();
});
