import type { ArmName, ArmPose } from "../characters/skeleton";

export type ArmHistory = {
  readonly before: (t: number, which: ArmName, hold: string, since: number) => ArmPose | undefined;
  readonly remember: (t: number, which: ArmName, hold: string, arm: ArmPose) => void;
  readonly clear: () => void;
  readonly of: (who: string) => ArmHistory;
};

export const FINAL_ARM = "arm";

export const AUTHORED_ARM = "authored";

export type ArmClock = { readonly history?: ArmHistory; readonly at: number };

export const lastArm = (clock: ArmClock | undefined, which: ArmName, key: string = FINAL_ARM) =>
  clock?.history?.before(clock.at, which, key, -Infinity);

const ON_THE_GRID = 1e-6;

export type ArmOpening = (who: string, which: ArmName) => ArmPose | undefined;

export const armHistory = (
  fps: number,
  settle: (t: number) => unknown,
  from = 0,
  cuts: readonly number[] = [],
  opening: ArmOpening = () => undefined,
): ArmHistory => {
  const reached = new Map<string, ArmPose>();
  const scoped = (scope: string): ArmHistory => {
    const key = (frame: number, which: ArmName, hold: string) => `${scope}|${which}|${hold}|${frame}`;
    return {
      before: (t, which, hold, since) => {
        const previous = Math.ceil(t * fps - ON_THE_GRID) - 1;
        const cut = Math.max(-Infinity, ...cuts.filter((c) => c <= t));
        const first = Math.ceil(Math.max(since, from, cut) * fps - ON_THE_GRID);
        const opens = hold === FINAL_ARM && previous === first - 1 && first === Math.ceil(from * fps - ON_THE_GRID);
        if (previous < first) return opens ? opening(scope, which) : undefined;
        for (let frame = first; frame <= previous && !reached.has(key(previous, which, hold)); frame++) settle(frame / fps);
        return reached.get(key(previous, which, hold));
      },
      remember: (t, which, hold, arm) => {
        const frame = Math.round(t * fps);
        if (Math.abs(t * fps - frame) < ON_THE_GRID) reached.set(key(frame, which, hold), arm);
      },
      clear: () => reached.clear(),
      of: (who) => scoped(`${scope}/${who}`),
    };
  };
  return scoped("");
};
