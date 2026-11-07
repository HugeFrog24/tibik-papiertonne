import { Vector3 } from "three";
import { expect, test } from "vitest";
import { RIG, TIBIK_REST } from "../Tibik/rig";
import { legOnToes, type Plant } from "./gait";
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
