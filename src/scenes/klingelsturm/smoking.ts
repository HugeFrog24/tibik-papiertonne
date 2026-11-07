import { Vector3, type Matrix4 } from "three";
import { round6 } from "../../characters/scalar";
import type { ArmPose, Placement } from "../../characters/skeleton";
import { karenHeadMatrix, karenMouthEmitter } from "../../Karen/mouthEmitter";
import { KAREN_SKELETON } from "../../Karen/rig";
import { sphereObbGap, type Obb } from "../../physics/collision";
import type { Hold } from "../../physics/holds";
import { cigaretteObb } from "../../props/cigaretteShape";
import { lighterObb } from "../../props/lighterShape";
import { storyTime } from "./cameras";
import { karenAt } from "./choreography";
import { CODA, ON_THE_FILTER, ashAt, burnedAt, cigaretteFrame, lighterFrame, lipsFrame } from "./cigarette";

const HAND = Math.max(...KAREN_SKELETON.hand.size);
const HELD_GAP = 0.0015;
const REACH = 0.3;
const SEARCH = 0.3;

export const smokedAt = (t: number) => {
  const story = storyTime(t);
  const burned = burnedAt(story);
  const sinceTheTap = t >= CODA.ashOff ? burned - burnedAt(storyTime(CODA.ashOff)) : Infinity;
  return { burned, ash: Math.min(ashAt(story), sinceTheTap) };
};

export const cigaretteAt = (t: number) => cigaretteFrame(karenAt(t), t);

export const lighterAt = (t: number) => {
  const karen = karenAt(t);
  return lighterFrame(karen, t, lipsFrame(karen), smokedAt(t).burned);
};

export const standOff = (box: Obb, from: Vector3, direction: Vector3, radius: number, gap: number) => {
  let [near, far] = [0, SEARCH];
  for (let i = 0; i < 32; i++) {
    const mid = (near + far) / 2;
    const center = from.clone().addScaledVector(direction, mid);
    if (sphereObbGap({ kind: "sphere", name: "hand", center, radius }, box) > gap) far = mid;
    else near = mid;
  }
  return from.clone().addScaledVector(direction, far);
};

const LIGHTER_ARM: ArmPose = { raise: 1.4, out: 0.86, elbow: 2.01, inward: 1.29 };

const UNDER_THE_LIGHTER = { right: 0.55, down: 0.75, forward: 0.35 };

const facing = (t: number) => {
  const { forward } = karenMouthEmitter(karenAt(t));
  const ahead = forward.clone().setY(0).normalize();
  return { ahead, right: ahead.clone().cross(new Vector3(0, 1, 0)).normalize() };
};

const underTheLighter = (t: number) => {
  const { ahead, right } = facing(t);
  const box = lighterObb(lighterAt(t));
  const direction = right
    .multiplyScalar(UNDER_THE_LIGHTER.right)
    .addScaledVector(new Vector3(0, -1, 0), UNDER_THE_LIGHTER.down)
    .addScaledVector(ahead, UNDER_THE_LIGHTER.forward)
    .normalize();
  return standOff(box, box.center.clone(), direction, HAND, HELD_GAP);
};

export const LIGHTER_HOLD: Hold = {
  name: "the lighter, up out of her fist",
  arm: "rightArm",
  reach: CODA.mediumCut,
  grip: CODA.lighterGrip,
  release: CODA.lighterDown[1],
  done: round6(CODA.lighterDown[1] + REACH),
  target: (t) => lighterObb(lighterAt(t)),
  near: underTheLighter,
  pose: LIGHTER_ARM,
  exact: true,
};

export const fingersOn = (karen: Placement, frame: Matrix4, box: Obb) => {
  const filter = new Vector3(0, 0, ON_THE_FILTER.along).applyMatrix4(frame);
  const along = new Vector3(0, 0, 1).transformDirection(frame);
  const fromHerHead = filter.clone().sub(new Vector3().setFromMatrixPosition(karenHeadMatrix(karen)));
  const away = fromHerHead.addScaledVector(along, -fromHerHead.dot(along)).normalize();
  return standOff(box, filter, away, HAND, HELD_GAP);
};

export const fingersOnTheFilter = (t: number) => {
  const frame = cigaretteAt(t);
  const { burned, ash } = smokedAt(t);
  return fingersOn(karenAt(t), frame, cigaretteObb(frame, burned, ash));
};

export const CIGARETTE_HOLD: Hold = {
  name: "the cigarette, between her fingers",
  arm: "rightArm",
  reach: CODA.lighterDown[1],
  grip: CODA.takeOut[0],
  release: CODA.end,
  done: round6(CODA.end + REACH),
  target: (t) => cigaretteObb(cigaretteAt(t), smokedAt(t).burned, smokedAt(t).ash),
  near: fingersOnTheFilter,
  exact: true,
};
