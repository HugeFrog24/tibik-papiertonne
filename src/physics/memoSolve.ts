import type { Pose } from "../characters/skeleton";
import { armHistory, type ArmHistory, type ArmOpening } from "./armHistory";

export const memoByFrame = <S>(solve: (t: number) => S) => {
  const solved = new Map<number, S>();
  const memo = (t: number): S => {
    const key = Math.round(t * 1000);
    let state = solved.get(key);
    if (!state) {
      state = solve(t);
      solved.set(key, state);
    }
    return state;
  };
  return Object.assign(memo, { clear: () => solved.clear() });
};

export const memoWithArms = <S>(fps: number, solve: (t: number, history: ArmHistory) => S, cuts: readonly number[] = [], opening?: ArmOpening) => {
  const history = armHistory(fps, (t) => memo(t), 0, cuts, opening);
  const memo = memoByFrame((t: number) => solve(t, history));
  return Object.assign((t: number) => memo(t), {
    clear: () => {
      memo.clear();
      history.clear();
    },
  });
};

export const openingOn = (end: () => Readonly<Record<string, { readonly pose: Pose }>>): ArmOpening => (who, which) =>
  end()[who.slice(1)]?.pose[which];
