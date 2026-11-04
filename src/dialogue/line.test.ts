import { expect, test } from "vitest";
import { speakingAmountIn, type Line } from "./line";

const line = (from: number, to: number): Line => ({
  speaker: "karen",
  from,
  to,
  text: "SCHULZ!",
  name: "Karen: Schulz",
  tone: "shout",
  box: { left: 0, top: 0, width: 100, height: 100, fontSize: 40 },
});

test("how much she is speaking rises and falls smoothly at the edges of each line, never in one step", () => {
  const amount = speakingAmountIn([line(1, 2), line(3, 3.5)]);
  expect(amount(0.5, "karen")).toBe(0);
  expect(amount(1.5, "karen")).toBe(1);
  expect(amount(3.25, "karen")).toBe(1);
  expect(amount(1.5, "tibik")).toBe(0);
  let before = amount(0, "karen");
  for (let t = 0; t <= 4; t += 1 / 30) {
    const now = amount(t, "karen");
    expect(Math.abs(now - before), t.toFixed(2)).toBeLessThan(0.35);
    before = now;
  }
});
