import { expect, test } from "vitest";
import { ACROSS_STREET, BLOCK_SPAN, houseNumber } from "./building";

const ours = [-3, -2, -1, 0, 1, 2, 3].map((n) => ({
  x: n * BLOCK_SPAN,
  number: houseNumber(12, n, 1),
}));
const across = [-3, -2, -1, 0, 1, 2, 3].map((n) => ({
  x: ACROSS_STREET.shift - n * BLOCK_SPAN,
  number: houseNumber(13, n, -1),
}));

test("house numbers zigzag: even on our side, odd across the street, both rising the same way along it", () => {
  for (const [side, parity] of [
    [ours, 0],
    [across, 1],
  ] as const) {
    const sorted = [...side].sort((a, b) => a.x - b.x);
    for (const house of sorted) expect(house.number % 2).toBe(parity);
    sorted
      .slice(1)
      .forEach((house, i) => { expect(house.number).toBeGreaterThan(sorted[i].number); },
      );
    expect(Math.min(...sorted.map((h) => h.number))).toBeGreaterThan(0);
  }
});
