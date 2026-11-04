import { expect, test } from "vitest";
import { sphereObbGap } from "../../physics/collision";
import { bodyColliders, boxIntoTorso } from "../../characters/skeleton";
import { RIG, TIBIK_REST } from "../../Tibik/rig";
import { CRADLE, tuckedParcel } from "./carry";

const heads = [
  { headPitch: 0, headYaw: 0 },
  { headPitch: 0.3, headYaw: 0 },
  { headPitch: -0.2, headYaw: 0 },
  { headPitch: 0.2, headYaw: 0.6 },
  { headPitch: 0.2, headYaw: -0.6 },
];

const carrying = (head: (typeof heads)[number], yaw = 0) => ({
  position: [1, 0.3, -2] as [number, number, number],
  rotationY: yaw,
  pose: { ...TIBIK_REST, ...head, leftArm: CRADLE },
  skeleton: RIG,
});

test("the parcel rests on his left forearm with his hand against it", () => {
  for (const yaw of [0, 1, -2.5]) {
    const c = carrying(heads[0], yaw);
    const parcel = tuckedParcel(c);
    const arm = bodyColliders(RIG, c).leftArm;
    const forearm = arm
      .filter((s) => s.name.includes("forearm"))
      .map((s) => sphereObbGap(s, parcel));
    const resting = forearm.filter((g) => g < 0.006);
    expect(resting.length).toBeGreaterThanOrEqual(3);
    expect(Math.min(...forearm)).toBeGreaterThan(-0.001);
    expect(sphereObbGap(arm[arm.length - 1], parcel)).toBeLessThan(0.01);
    const under = resting.length > 0 && parcel.center.y > arm[8].center.y;
    expect(under).toBe(true);
  }
});

test("the tucked parcel leans on his belly without sinking into it, his head or his other arm, whatever his head does", () => {
  for (const head of heads) {
    const c = carrying(head);
    const parcel = tuckedParcel(c);
    expect(boxIntoTorso(RIG, c, parcel)).toBe(0);
    const body = bodyColliders(RIG, c);
    for (const s of [...body.head, ...body.leftArm, ...body.rightArm])
      expect(sphereObbGap(s, parcel), s.name).toBeGreaterThan(-0.001);
  }
});
