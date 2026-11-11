import { TIMELINE_FPS } from "./frameRate";

export type ClockHold = { readonly at: number; readonly frames: number };

export type SceneClock = {
  readonly holds: readonly ClockHold[];
  readonly frames: number;
  readonly storyAt: (t: number) => number;
  readonly editAt: (story: number) => number;
};

export const heldClock = (holds: readonly ClockHold[]): SceneClock => {
  const sorted = [...holds].sort((a, b) => a.at - b.at);
  const seconds = (hold: ClockHold) => hold.frames / TIMELINE_FPS;
  return {
    holds: sorted,
    frames: sorted.reduce((sum, hold) => sum + hold.frames, 0),
    storyAt: (t) => {
      let held = 0;
      for (const hold of sorted) {
        if (t <= hold.at + held) return t - held;
        if (t < hold.at + held + seconds(hold)) return hold.at;
        held += seconds(hold);
      }
      return t - held;
    },
    editAt: (story) => story + sorted.filter((hold) => hold.at < story).reduce((sum, hold) => sum + seconds(hold), 0),
  };
};

export const STEADY = heldClock([]);
