import { Vector3 } from "three";
import type { Placement, Pose } from "../characters/skeleton";
import { karenHeadMatrix } from "./mouthEmitter";
import { KAREN_HEAD_LIMITS } from "./rig";

export const KAREN_TURN = { twist: 0.8, lean: 0.35, gaze: 0.5 };

const STEPS = 4;

const clamp = (v: number, low: number, high: number) => Math.min(high, Math.max(low, v));
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const yawOf = (v: Vector3) => Math.atan2(v.x, v.z);
const pitchOf = (v: Vector3) => Math.atan2(v.y, Math.hypot(v.x, v.z));

export const karenLooksAlong = (karen: Placement) => {
  const head = karenHeadMatrix(karen);
  return { origin: new Vector3().setFromMatrixPosition(head), forward: new Vector3(0, 0, 1).transformDirection(head) };
};

const errorsOf = (karen: Placement, target: Vector3) => {
  const { origin, forward } = karenLooksAlong(karen);
  const toward = target.clone().sub(origin);
  return { yaw: wrap(yawOf(toward) - yawOf(forward)), pitch: pitchOf(toward) - pitchOf(forward) };
};

export const karenTurnedTo = (karen: Placement, target: Vector3, weight: number, turn = KAREN_TURN): Pose => {
  const base = karen.pose;
  if (weight <= 0) return base;
  let pose = base;
  for (let i = 0; i < STEPS; i++) {
    const error = errorsOf({ ...karen, pose }, target);
    const headYaw = clamp(pose.headYaw + error.yaw, -KAREN_HEAD_LIMITS.yaw, KAREN_HEAD_LIMITS.yaw);
    const twist = clamp(pose.twist + error.yaw - (headYaw - pose.headYaw), base.twist - turn.twist, base.twist + turn.twist);
    const lean = clamp(pose.lean - error.pitch, base.lean, base.lean + turn.lean);
    const headPitch = clamp(pose.headPitch - error.pitch - (lean - pose.lean), -KAREN_HEAD_LIMITS.pitchUp, 0);
    pose = { ...pose, headYaw, twist, lean, headPitch };
  }
  const rest = errorsOf({ ...karen, pose }, target);
  const turned: Pose = {
    ...pose,
    gazeYaw: clamp(rest.yaw, -turn.gaze, turn.gaze),
    gazePitch: clamp(rest.pitch, -turn.gaze, turn.gaze),
  };
  const mix = (a: number, b: number) => a + (b - a) * weight;
  return {
    ...base,
    headYaw: mix(base.headYaw, turned.headYaw),
    twist: mix(base.twist, turned.twist),
    lean: mix(base.lean, turned.lean),
    headPitch: mix(base.headPitch, turned.headPitch),
    gazeYaw: mix(base.gazeYaw, turned.gazeYaw),
    gazePitch: mix(base.gazePitch, turned.gazePitch),
  };
};
