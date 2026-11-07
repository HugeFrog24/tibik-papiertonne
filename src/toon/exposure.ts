import type { CameraSetup } from "./shots";

export const SHUTTER = { angle: 180, samples: 6 };

const same = (a: CameraSetup, b: CameraSetup) => JSON.stringify(a) === JSON.stringify(b);

export const exposureOf = (at: (t: number) => CameraSetup, t: number, fps: number): CameraSetup[] => {
  const open = SHUTTER.angle / 360 / fps;
  const poses = Array.from({ length: SHUTTER.samples }, (_, i) => at(t - open + (open * (i + 0.5)) / SHUTTER.samples));
  return poses.every((pose) => same(pose, poses[0])) ? [at(t)] : poses;
};
