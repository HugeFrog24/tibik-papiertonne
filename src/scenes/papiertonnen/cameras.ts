import { Vector3 } from "three";
import { lazy } from "../../physics/lazy";
import { FPS, aspectOf } from "../../frameRate";
import { ENTRANCE_X, FACADE_Z } from "../../street/building";
import { onFrames, camerasOf, following, type CameraSetup, type Shot } from "../../toon/shots";
import { mouthInWorld } from "../../dialogue/screen";
import { RIG } from "../../Tibik/rig";
import type { Vec3 } from "../../toon/primitives";
import {
  BIN_Z,
  PAPIERTONNEN_DURATION,
  SHOT_FOUND_BOX,
  SHOT_INSIDE_BIN,
  SHOT_OPEN_LID,
  tibikAt,
  TARGET_BIN_X,
  kf,
} from "./choreography";

const ON_THE_DOOR = { x: ENTRANCE_X, height: 1.35, z: FACADE_Z, fov: 30 };
const AT_THE_BINS = { x: 1.2, height: 1.0, z: -1.3, fov: 34 };

const wideCamera = (t: number): CameraSetup => {
  const follow = kf(t, [0.6, SHOT_OPEN_LID], [0, 1]);
  const crane = kf(t, [0, 2.0], [1, 0]);
  const between = (a: number, b: number) => a + (b - a) * follow;
  const x = between(ON_THE_DOOR.x, AT_THE_BINS.x);
  return {
    position: [x, 1.55 + crane * 0.9, 4.6],
    target: [
      x,
      between(ON_THE_DOOR.height, AT_THE_BINS.height),
      between(ON_THE_DOOR.z, AT_THE_BINS.z),
    ],
    fov: between(ON_THE_DOOR.fov, AT_THE_BINS.fov),
  };
};

const openLidCamera = (t: number): CameraSetup => {
  const push = kf(t - SHOT_OPEN_LID, [0, 1.6], [0, 1]);
  return {
    position: [4.3 - push * 0.4, 1.45, 0.4 - push * 0.15],
    target: [TARGET_BIN_X - 0.1, 1.0, -1.3],
    fov: 36,
  };
};

export const insideBinCamera = (t: number): CameraSetup => ({
  position: [TARGET_BIN_X, 0.9, BIN_Z - 0.24],
  target: [TARGET_BIN_X + kf(t, [0, 2.2], [0, 0.03]), 1.3, BIN_Z + 0.3],
  fov: 62,
});

const FOUND_TIMES = [0, 1.2, 2.0, 3.5];

const foundBoxCamera = (t: number): CameraSetup => {
  const u = t - SHOT_FOUND_BOX;
  const at = (values: number[]) => kf(u, FOUND_TIMES, values);
  return {
    position: [
      at([3.4, 3.35, 3.3, 3.05]),
      at([1.95, 1.9, 1.5, 1.45]),
      at([-0.15, -0.05, 2.8, 2.5]),
    ],
    target: [
      at([1.35, 1.35, 1.25, 1.25]),
      at([1.06, 1.1, 1.05, 1.05]),
      at([-1.45, -1.35, -0.85, -0.85]),
    ],
    fov: at([36, 36, 32, 32]),
  };
};

const hisHead = (t: number): Vec3 => mouthInWorld(RIG, tibikAt(t)).toArray();

const PULL_BACK = SHOT_FOUND_BOX + FOUND_TIMES[1];

const followingHim = following(foundBoxCamera, hisHead, { shift: [0, 0.15, 0] }).tall;


const viewOf = (setup: CameraSetup) => new Vector3(...setup.target).sub(new Vector3(...setup.position));
const yawPitchOf = (setup: CameraSetup) => {
  const v = viewOf(setup).normalize();
  return [Math.atan2(v.x, v.z), Math.asin(v.y)];
};
const STEADY_TURN = 0.03;

const RATE_LIMITED = lazy(() => {
  const first = Math.ceil(PULL_BACK * FPS);
  const last = Math.ceil(PAPIERTONNEN_DURATION * FPS);
  let [yaw, pitch] = yawPitchOf(followingHim(first / FPS));
  const turns: [number, number][] = [[yaw, pitch]];
  for (let f = first + 1; f <= last; f++) {
    const [t, before] = [f / FPS, (f - 1) / FPS];
    const [wantYaw, wantPitch] = yawPitchOf(followingHim(t));
    const [shotYaw0, shotPitch0] = yawPitchOf(foundBoxCamera(before));
    const [shotYaw1, shotPitch1] = yawPitchOf(foundBoxCamera(t));
    const high = (foundBoxCamera(t).fov * Math.PI) / 180;
    const across = 2 * Math.atan(Math.tan(high / 2) * aspectOf("tall"));
    const step = (want: number, now: number, shot: number, steady: number) => now + Math.max(-(Math.abs(shot) + steady), Math.min(Math.abs(shot) + steady, want - now));
    yaw = step(wantYaw, yaw, shotYaw1 - shotYaw0, STEADY_TURN * across);
    pitch = step(wantPitch, pitch, shotPitch1 - shotPitch0, STEADY_TURN * high);
    turns.push([yaw, pitch]);
  }
  return { first, turns };
});

const foundBoxTall = (t: number): CameraSetup => {
  if (t <= PULL_BACK) return followingHim(t);
  const { first, turns } = RATE_LIMITED();
  const at = Math.min(turns.length - 1, Math.max(0, t * FPS - first));
  const [i, k] = [Math.floor(at), at - Math.floor(at)];
  const [a, b] = [turns[i], turns[Math.min(i + 1, turns.length - 1)]];
  const [yaw, pitch] = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  const shot = foundBoxCamera(t);
  const reach = viewOf(shot).length();
  const view = new Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(reach);
  return { ...shot, target: new Vector3(...shot.position).add(view).toArray() };
};

export const SHOTS: readonly Shot[] = onFrames([
  {
    name: "Wide: walk to the bins",
    from: 0,
    to: SHOT_OPEN_LID,
    at: wideCamera,
  },
  {
    name: "Side: open the lid",
    from: SHOT_OPEN_LID,
    to: SHOT_INSIDE_BIN,
    at: openLidCamera,
  },
  {
    name: "Inside the bin",
    from: SHOT_INSIDE_BIN,
    to: SHOT_FOUND_BOX,
    at: (t) => insideBinCamera(t - SHOT_INSIDE_BIN),
  },
  {
    name: "Found a box",
    from: SHOT_FOUND_BOX,
    to: PAPIERTONNEN_DURATION,
    at: foundBoxCamera,
    tall: foundBoxTall,
  },
]);

export const { cameraAt } = camerasOf(SHOTS);
