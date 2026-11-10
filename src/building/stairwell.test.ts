import { Vector3 } from "three";
import { describe, expect, test } from "vitest";
import { boxGap, sphere, collide } from "../physics/collision";
import { OPENINGS, STOREY_HEIGHT, floorLevel } from "../street/building";
import { HAUSTUER } from "../street/facade";
import { doorLeaf } from "./doors";
import {
  CORE,
  FLIGHTS,
  HALF_LANDINGS,
  HANDRAIL,
  LANE_SPLIT,
  STAIRWELL_RAILINGS,
  TIBIK_DOOR,
  TREADS,
  riserZ,
  stairwellGround,
  stairwellSolids,
  undersideAbove,
  stairwellShown,
} from "./stairwell";

describe("staircase", () => {
  test("every flight follows the norms (DIN 18065)", () => {
    for (const flight of FLIGHTS) {
      expect(flight.risers).toBeLessThanOrEqual(18);
      expect([0.175, STOREY_HEIGHT / 16].some((r) => Math.abs(flight.rise - r) < 1e-9)).toBe(true);
      expect(flight.going).toBeCloseTo(0.28, 9);
      expect(2 * flight.rise + flight.going).toBeGreaterThan(0.59);
      expect(2 * flight.rise + flight.going).toBeLessThan(0.65);
    }
  });

  test("the staircase windows sit above the half landings", () => {
    const stairs = OPENINGS.filter((o) => o.kind === "stairs");
    for (const window of stairs.filter((o) => o.y > 3.5)) {
      const landing = HALF_LANDINGS.find((l) => Math.abs(window.y - l.y - 1.575) < 0.01);
      expect(landing, `half landing under the window at ${window.y}`).toBeDefined();
      expect(landing!.z0).toBeCloseTo(CORE.z0, 9);
    }
    for (const window of stairs) {
      expect(window.x - 0.4).toBeGreaterThanOrEqual(CORE.x0);
      expect(window.x + 0.4).toBeLessThanOrEqual(CORE.x1);
    }
    expect(Math.min(...stairs.map((o) => o.y))).toBeCloseTo(floorLevel(1) + 0.15, 9);
  });

  test("headroom is at least 2 m everywhere you can walk", () => {
    const low: string[] = [];
    for (const tread of TREADS) {
      const [cx, , cz] = tread.center;
      const [sx, , sz] = tread.size;
      for (let x = cx - sx / 2 + 0.025; x < cx + sx / 2; x += 0.05) {
        for (let z = cz - sz / 2 + 0.025; z < cz + sz / 2; z += 0.05) {
          const headroom = undersideAbove(x, tread.top, z) - tread.top;
          if (headroom < 2.0) {
            low.push(`${tread.name} at (${x.toFixed(2)}, ${z.toFixed(2)}): ${headroom.toFixed(2)} m`);
          }
        }
      }
    }
    expect(low.slice(0, 10)).toEqual([]);
  });

  test("the Haustür swings open without hitting the stairs", () => {
    const stairs = stairwellSolids({ tibik: 0 }).filter((s) => s.kind === "obb" && /tread|landing|flight/.test(s.name));
    for (let a = 0; a <= 1.5; a += 0.05) {
      for (const s of stairs) {
        expect(boxGap(doorLeaf(HAUSTUER, a), s), `${s.name} at ${a.toFixed(2)} rad`).toBeGreaterThan(0);
      }
    }
  });

  test("his door is 1010 mm wide and opens into the flat", () => {
    expect(TIBIK_DOOR.width).toBeCloseTo(0.985, 2);
    expect(doorLeaf(TIBIK_DOOR, 1.2).center.x).toBeLessThan(CORE.x0);
  });

  test("ground is continuous along the walking line, from his landing to the street", () => {
    const x = (CORE.x0 + -1.9) / 2;
    let before = stairwellGround(x, -9.5);
    expect(before).toBeCloseTo(floorLevel(1), 9);
    for (let z = -9.5; z <= -1.0; z += 0.01) {
      const now = stairwellGround(x, z);
      expect(Math.abs(now - before)).toBeLessThanOrEqual(0.175 + 1e-9);
      before = now;
    }
    expect(stairwellGround(x, -1.0)).toBe(0);
  });

  test("the doorway and his landing are free, the stairs are solid", () => {
    const solids = stairwellSolids({ tibik: 0 });
    const free = (p: Vector3) => !solids.some((s) => collide(sphere("probe", p, 0.2), s) !== null);
    expect(free(new Vector3(-2.2, 1.0, -3.0))).toBe(true);
    expect(free(new Vector3(-2.55, 3.3 + 1.0, -9.3))).toBe(true);
    expect(free(new Vector3(-2.55, 0.6, -6.0))).toBe(false);
  });
});

test("handrails sit 80–115 cm above the nosings and leave at least 5 cm to the wall (DIN 18065)", () => {
  const rails = STAIRWELL_RAILINGS.filter((r) => r.name === "handrail");
  expect(rails.length).toBe(FLIGHTS.length);
  for (const rail of rails) {
    const wall = rail.center.x < LANE_SPLIT ? CORE.x0 : CORE.x1;
    expect(Math.abs(rail.center.x - wall) - rail.half[0]).toBeGreaterThanOrEqual(0.05);
  }
  for (const h of HANDRAIL) {
    const flight = FLIGHTS.find((f) => f.name === h.flight)!;
    const aboveNosing = h.from[1] - (flight.from + flight.rise);
    expect(aboveNosing).toBeGreaterThanOrEqual(0.8);
    expect(aboveNosing).toBeLessThanOrEqual(1.15);
  }
});

test("risers are counted from a flight's first riser, uphill", () => {
  const eg = FLIGHTS[0];
  expect(riserZ(eg, 0)).toBeCloseTo(eg.firstRiser, 9);
  expect(riserZ(eg, 17)).toBeCloseTo(eg.firstRiser + eg.direction * 17 * eg.going, 9);
  expect(stairwellGround(-2.7, riserZ(eg, 5) - eg.direction * 0.05)).toBeCloseTo(eg.from + 5 * eg.rise, 9);
});

test("the stairwell is drawn while the Haustür stands open or he is inside, and not otherwise", () => {
  expect(stairwellShown({ haustuer: 0 })).toBe(false);
  expect(stairwellShown({ haustuer: 0, indoors: 0 })).toBe(false);
  expect(stairwellShown({ haustuer: 0.2 })).toBe(true);
  expect(stairwellShown({ haustuer: 0, indoors: 1 })).toBe(true);
});
