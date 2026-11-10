import { expect, test } from "vitest";
import { leafAround } from "./glazedLeaf";
import { HAUSTUER, HAUSTUER_GLASS } from "../street/facade";
import { LIVING_DOOR, LIVING_GLASS } from "./livingRoomShape";

const area = (size: readonly number[]) => size[0] * size[1];

test("the Haustür has a real glazed opening: the leaf is built round it, its parts tiling the leaf exactly except where the glass is", () => {
  const parts = leafAround(HAUSTUER, HAUSTUER_GLASS);
  expect(parts).toHaveLength(4);
  expect(parts.reduce((sum, p) => sum + area(p.size), 0)).toBeCloseTo(HAUSTUER.width * HAUSTUER.height - HAUSTUER_GLASS.w * HAUSTUER_GLASS.h, 9);
  for (const p of parts) {
    expect(p.size[2]).toBe(HAUSTUER.thickness);
    const [x, y] = p.center;
    const inside = Math.abs(x - HAUSTUER_GLASS.x) < (HAUSTUER_GLASS.w + p.size[0]) / 2 - 1e-9 && Math.abs(y - HAUSTUER_GLASS.y) < (HAUSTUER_GLASS.h + p.size[1]) / 2 - 1e-9;
    expect(inside, `part at ${x.toFixed(3)}, ${y.toFixed(3)} overlaps the glass`).toBe(false);
    expect(x - p.size[0] / 2).toBeGreaterThanOrEqual(-1e-9);
    expect(x + p.size[0] / 2).toBeLessThanOrEqual(HAUSTUER.width + 1e-9);
    expect(y - p.size[1] / 2).toBeGreaterThanOrEqual(-1e-9);
    expect(y + p.size[1] / 2).toBeLessThanOrEqual(HAUSTUER.height + 1e-9);
  }
});

test("its glass is patterned and translucent, not clear and not opaque: the hallway shows through it as soft light and shapes", () => {
  expect(HAUSTUER_GLASS.opacity).toBeGreaterThan(0.3);
  expect(HAUSTUER_GLASS.opacity).toBeLessThan(0.75);
  expect(HAUSTUER_GLASS.y - HAUSTUER_GLASS.h / 2).toBeGreaterThan(0.5);
  expect(HAUSTUER_GLASS.y + HAUSTUER_GLASS.h / 2).toBeLessThan(HAUSTUER.height - 0.15);
});

test("his living-room door's glass is a real opening too, patterned and translucent, filling the panel between its stiles and rails", () => {
  const parts = leafAround(LIVING_DOOR, LIVING_GLASS);
  expect(parts.reduce((sum, p) => sum + area(p.size), 0)).toBeCloseTo(LIVING_DOOR.width * LIVING_DOOR.height - LIVING_GLASS.w * LIVING_GLASS.h, 9);
  expect(LIVING_GLASS.w).toBeCloseTo(LIVING_DOOR.width - 2 * LIVING_DOOR.glass.x, 9);
  expect(LIVING_GLASS.y - LIVING_GLASS.h / 2).toBeCloseTo(LIVING_DOOR.glass.bottom, 9);
  expect(LIVING_GLASS.y + LIVING_GLASS.h / 2).toBeCloseTo(LIVING_DOOR.height - LIVING_DOOR.glass.top, 9);
  expect(LIVING_GLASS.opacity).toBeGreaterThan(0.3);
  expect(LIVING_GLASS.opacity).toBeLessThan(0.75);
});
