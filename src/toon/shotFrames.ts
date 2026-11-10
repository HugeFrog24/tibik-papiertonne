export type CutShot = {
  readonly name: string;
  readonly from: number;
  readonly to: number;
  readonly blur?: boolean;
};

export const shotFrames = (shots: readonly CutShot[], fps: number) =>
  shots.map((shot) => {
    const from = Math.round(shot.from * fps);
    return {
      name: shot.name,
      from,
      duration: Math.round(shot.to * fps) - from,
    };
  });
