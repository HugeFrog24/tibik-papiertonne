import { expect } from "vitest";

export const expectSwitchingOffOneByOne = (
  onAt: (share: number) => readonly (readonly number[])[],
  windows: number,
  shares: readonly number[] = [0.8, 0.5, 0.2, 0],
) => {
  const evening = onAt(1).map((on) => new Set(on));
  const lit = evening.reduce((n, on) => n + on.size, 0) / windows;
  expect(lit).toBeGreaterThan(0.1);
  expect(lit).toBeLessThan(0.35);
  let before = evening;
  for (const share of shares) {
    const now = onAt(share).map((on) => new Set(on));
    now.forEach((on, i) => {
      for (const k of on) expect(before[i].has(k), `window ${k} came back on at ${share}`).toBe(true);
    });
    before = now;
  }
  expect(before.every((on) => on.size === 0)).toBe(true);
  return evening;
};
