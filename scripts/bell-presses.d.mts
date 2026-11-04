export type BellStorm = {
  readonly from: number;
  readonly until: number;
  readonly period: number;
  readonly press: number;
};

export type BellRhythm = {
  readonly eighth: number;
  readonly slots: readonly number[];
};

export declare const bellPresses: (
  storm: BellStorm,
  rhythm: BellRhythm,
) => [number, number][];
