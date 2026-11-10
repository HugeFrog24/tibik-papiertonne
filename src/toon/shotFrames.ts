import { renderFrame } from "../frameRate";

export type CutShot = {
  readonly name: string;
  readonly from: number;
  readonly to: number;
  readonly blur?: boolean;
};

export const shotFrames = (shots: readonly CutShot[], fps: number) =>
  shots.map((shot) => {
    const from = renderFrame(shot.from, fps);
    return {
      name: shot.name,
      from,
      duration: renderFrame(shot.to, fps) - from,
    };
  });
