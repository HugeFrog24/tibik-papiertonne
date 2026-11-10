import { Matrix4, Quaternion, Vector3 } from "three";
import { expect, test } from "vitest";
import { TIBIK_GAIT } from "../Tibik/character";
import { RIG, TIBIK_REST } from "../Tibik/rig";
import { footAt, legOnToes, planGait, rhythmicSteps, type Plant, type RootAt } from "./gait";
import { footCenter, legFramesOf, type Placement } from "./skeleton";

const standing: Placement = { position: [0, 0, 0], rotationY: 0.4, pose: TIBIK_REST };
const plant: Plant = {
  side: 1,
  on: 0,
  off: Infinity,
  ankle: new Vector3().setFromMatrixPosition(legFramesOf(RIG, standing, 1).ankle),
  yaw: 0.4,
  support: 0,
  heelScale: 1,
  toeScale: 1,
};

const drawnFoot = (rise: number) => {
  const raised = { ...standing, pose: { ...standing.pose, bob: rise } };
  const placement = { ...raised, pose: { ...raised.pose, leftLeg: legOnToes(RIG, raised, 1, plant) } };
  const ankle = legFramesOf(RIG, placement, 1).ankle;
  const [x, y, z] = footCenter(RIG, 1);
  const [, ry, rz] = RIG.foot.size;
  const at = (dy: number, dz: number) => new Vector3(x, y + dy, z + dz).applyMatrix4(ankle);
  const lowest = Math.min(...Array.from({ length: 721 }, (_, i) => (i / 720) * 2 * Math.PI).map((a) => at(ry * Math.sin(a), rz * Math.cos(a)).y));
  return { tip: at(0, rz), heel: at(0, -rz), lowest };
};

test("rising on his toes, his drawn foot rolls on the floor without skidding: its lowest point stays on the floor and its toe tip stays where it stood while the heel lifts", () => {
  const flat = drawnFoot(0);
  const risen = drawnFoot(0.03);
  expect(risen.heel.y - flat.heel.y).toBeGreaterThan(0.05);
  expect(Math.abs(risen.lowest - flat.lowest)).toBeLessThan(0.001);
  const moved = Math.hypot(risen.tip.x - flat.tip.x, risen.tip.z - flat.tip.z);
  expect(moved).toBeLessThan(0.02);
});

const lowestOfTheDrawnFoot = (ankle: Vector3, rotation: Quaternion) => {
  const [rx, ry, rz] = RIG.foot.size;
  const centre = new Vector3(...footCenter(RIG, 1)).applyQuaternion(rotation).add(ankle);
  const m = new Matrix4().makeRotationFromQuaternion(rotation).elements;
  return centre.y - Math.hypot(rx * m[1], ry * m[5], rz * m[9]);
};

const PIVOT_GAP = 0.017;

test("walking on flat ground, a planted foot's drawn underside lifts at most 1.7 cm off the floor as it pivots on its heel and toe (the walk pivots on the collision capsule, which reaches that much lower than the drawn foot)", () => {
  const walk: RootAt = (t) => ({ x: 0.8 * t, z: 0, yaw: Math.PI / 2 });
  const steps = rhythmicSteps({ from: 0, to: 2, first: -1, cadence: () => 4, overlap: 0.1 });
  const plan = planGait(RIG, TIBIK_GAIT, walk, steps, [-1, 3]);
  const still: Placement = { position: [0, 0, 0], rotationY: 0, pose: TIBIK_REST };
  const flat = lowestOfTheDrawnFoot(new Vector3().setFromMatrixPosition(legFramesOf(RIG, still, 1).ankle), new Quaternion());
  const lifts = ([1, -1] as const).flatMap((side) =>
    plan.plants[side === 1 ? "leftLeg" : "rightLeg"]
      .filter((p) => p.on > 0 && p.off < 2)
      .flatMap((p) => Array.from({ length: Math.floor((p.off - p.on) / 0.005) + 1 }, (_, i) => p.on + i * 0.005))
      .map((t) => {
        const foot = footAt(plan, side, t);
        return lowestOfTheDrawnFoot(foot.ankle, foot.rotation) - flat;
      }),
  );
  expect(lifts.length).toBeGreaterThan(100);
  expect(Math.max(...lifts)).toBeLessThanOrEqual(PIVOT_GAP);
});
