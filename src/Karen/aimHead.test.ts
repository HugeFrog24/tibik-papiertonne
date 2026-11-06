import { Vector3 } from "three";
import { expect, test } from "vitest";
import type { Placement } from "../characters/skeleton";
import { KAREN_TURN, karenLooksAlong, karenTurnedTo } from "./aimHead";
import { KAREN_HEAD_LIMITS, KAREN_REST } from "./rig";

const STANDING: Placement = { position: [0, 0, 0], rotationY: 0, pose: KAREN_REST };

const pointAt = (yawDeg: number, pitchDeg: number, distance = 2) => {
  const { origin } = karenLooksAlong(STANDING);
  const yaw = (yawDeg * Math.PI) / 180;
  const pitch = (pitchDeg * Math.PI) / 180;
  return origin.clone().add(new Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(distance));
};

const offBy = (karen: Placement, target: Vector3) => {
  const { origin, forward } = karenLooksAlong(karen);
  return (forward.angleTo(target.clone().sub(origin)) * 180) / Math.PI;
};

test("turned to a point 40 degrees to her side and 20 degrees below, she faces it with neck, body and a lean, her neck within its limits", () => {
  for (const side of [-1, 1]) {
    const target = pointAt(40 * side, -20);
    const pose = karenTurnedTo(STANDING, target, 1);
    expect(offBy({ ...STANDING, pose }, target), `side ${side}`).toBeLessThan(3);
    expect(Math.abs(pose.headYaw)).toBeLessThanOrEqual(KAREN_HEAD_LIMITS.yaw + 1e-9);
    expect(Math.abs(pose.twist - KAREN_REST.twist)).toBeLessThanOrEqual(KAREN_TURN.twist + 1e-9);
    expect(pose.lean - KAREN_REST.lean).toBeLessThanOrEqual(KAREN_TURN.lean + 1e-9);
    expect(pose.headPitch).toBeLessThanOrEqual(1e-9);
  }
});

test("beyond what her body turns, her eyes take the rest; at weight 0 nothing moves", () => {
  const target = pointAt(-100, 0);
  const pose = karenTurnedTo(STANDING, target, 1);
  expect(Math.abs(pose.twist - KAREN_REST.twist)).toBeCloseTo(KAREN_TURN.twist, 6);
  expect(Math.sign(pose.gazeYaw)).toBe(Math.sign(pose.twist - KAREN_REST.twist));
  expect(Math.abs(pose.gazeYaw)).toBeGreaterThan(0.1);
  expect(karenTurnedTo(STANDING, target, 0)).toEqual(KAREN_REST);
});

test("starting from a raised head and her own lean, she still settles on a point below her: head and lean share the dip instead of see-sawing", () => {
  const raised: Placement = { ...STANDING, pose: { ...KAREN_REST, headPitch: -0.1, lean: 0.05 } };
  for (const [yaw, pitch] of [[-55, -13], [0, -10], [30, -18]] as const) {
    const target = pointAt(yaw, pitch, 0.9);
    const pose = karenTurnedTo(raised, target, 1);
    expect(offBy({ ...raised, pose }, target), `${yaw}/${pitch}`).toBeLessThan(3);
  }
});
