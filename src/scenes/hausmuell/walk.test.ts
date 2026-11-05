import { expect, test } from "vitest";
import { footfallOffset } from "../../Karen/footfall";
import { KAREN_WALK_TRACK, karenAt, karenGait } from "./choreography";

test("walking after Tibik, Karen's footfalls land near her centre line, on her walking track, not her wide standing stance", () => {
  const sideways = (t: number, side: 1 | -1) =>
    footfallOffset(karenAt(t), side);
  const walking = karenGait()
    .touchdowns.filter((s) => s.time > 25.5)
    .map((s) => sideways(s.time + 0.01, s.side));
  expect(walking.length).toBeGreaterThan(2);
  const mean = walking.reduce((a, b) => a + b, 0) / walking.length;
  const standing = sideways(18.3, 1);
  expect(standing).toBeGreaterThan(0.5);
  expect(Math.abs(mean - KAREN_WALK_TRACK)).toBeLessThan(
    Math.abs(standing - mean),
  );
  expect(KAREN_WALK_TRACK).toBeLessThan(0.35);
});
