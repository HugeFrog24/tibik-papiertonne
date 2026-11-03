import { expect, test } from "vitest";
import { memoByFrame } from "./memoSolve";

test("each frame is solved once and the same result is reused", () => {
  let calls = 0;
  const solve = memoByFrame((t: number) => {
    calls++;
    return { t };
  });
  const first = solve(1.5);
  expect(solve(1.5)).toBe(first);
  expect(solve(1.5 + 1e-5)).toBe(first);
  expect(solve(1.6)).not.toBe(first);
  expect(calls).toBe(2);
});

test("clearing the cache solves frames afresh", () => {
  let calls = 0;
  const solve = memoByFrame((t: number) => {
    calls++;
    return { t };
  });
  const first = solve(2);
  solve.clear();
  expect(solve(2)).not.toBe(first);
  expect(solve(2)).toEqual(first);
  expect(calls).toBe(2);
});
