import { expect, test } from "vitest";
import { OUTLINE } from "../toon/primitives";
import {
  GRILLE,
  BODY,
  INTAKE,
  PARKED_CARS,
  PLATE,
  PLATE_HOLDER,
  SILL,
  faceX,
  hasDealerStrip,
  holderRect,
  plateOn,
} from "./carShape";

const ENDS = [
  [PLATE.front, 1],
  [PLATE.rear, -1],
] as const;

test("§ 12 (8) FZV: the front plate's lower edge is at least 200 mm over the road, leaning back against the direction of travel by at most 30 degrees", () => {
  const plate = plateOn(PLATE.front, 1);
  const lower = plate.y - (PLATE.size[1] / 2) * Math.cos(plate.tilt);
  expect(lower).toBeGreaterThanOrEqual(0.2);
  expect(plate.tilt).toBeLessThanOrEqual(0);
  expect(plate.tilt).toBeGreaterThanOrEqual(-Math.PI / 6);
  const r = holderRect();
  expect(
    plate.y + (r.centre - r.height / 2) * Math.cos(plate.tilt),
  ).toBeGreaterThan(SILL);
});

test("the holder frames the plate on every side and sits behind it, covering none of it", () => {
  const r = holderRect();
  expect(r.width / 2).toBeGreaterThan(PLATE.size[0] / 2);
  expect(r.centre + r.height / 2).toBeGreaterThan(PLATE.size[1] / 2);
  expect(r.centre - r.height / 2).toBeLessThan(-PLATE.size[1] / 2);
  expect(PLATE_HOLDER.behind).toBeGreaterThan(0);
  expect(PLATE_HOLDER.behind).toBeLessThan(PLATE.lift);
});

test("the holder lies on the bumper and tailgate, neither floating nor sunk in", () => {
  const r = holderRect();
  for (const [y, end] of ENDS) {
    const plate = plateOn(y, end);
    const [sin, cos] = [Math.sin(plate.tilt), Math.cos(plate.tilt)];
    const [low, high] = [r.centre - r.height / 2, r.centre + r.height / 2];
    const crossings = BODY.map(
      ([, by]) => (by - y - PLATE_HOLDER.behind * end * sin) / cos,
    ).filter((a) => a > low && a < high);
    const sweep = Array.from(
      { length: 201 },
      (_, k) => low + ((high - low) * k) / 200,
    );
    for (const along of [...sweep, ...crossings]) {
      const x = plate.x + along * sin - PLATE_HOLDER.behind * end * cos;
      const edge = y + along * cos + PLATE_HOLDER.behind * end * sin;
      const gap = end * (x - faceX(edge, end));
      expect(gap, `${end} at ${along}`).toBeGreaterThan(0.0005);
      expect(gap, `${end} at ${along}`).toBeLessThan(0.01);
    }
  }
});

test("the front holder keeps clear of the grille above and the air intake below, ink lines included", () => {
  const r = holderRect();
  const plate = plateOn(PLATE.front, 1);
  const top = plate.y + (r.centre + r.height / 2) * Math.cos(plate.tilt);
  const bottom = plate.y + (r.centre - r.height / 2) * Math.cos(plate.tilt);
  expect(bottom).toBeGreaterThan(
    INTAKE.y + INTAKE.size[1] / 2 + OUTLINE + 0.003,
  );
  expect(top).toBeLessThan(GRILLE.y - GRILLE.size[1] / 2 - OUTLINE - 0.003);
});

test("asking about a car that isn't parked here is an error, not a guess", () => {
  expect(() => hasDealerStrip({ ...PARKED_CARS[0] })).toThrow();
});

test("most cars came with a dealer's holder, a few have plain ones", () => {
  const dealer = PARKED_CARS.filter(hasDealerStrip).length;
  expect(dealer).toBeGreaterThanOrEqual(PARKED_CARS.length / 2);
  expect(dealer).toBeLessThan(PARKED_CARS.length);
});
