import { ShapeGeometry, Vector3 } from "three";
import { describe, expect, test } from "vitest";
import { doorLeaf } from "../building/doors";
import { collide, sphere } from "../physics/collision";
import { DOORWAY, FACADE_THICKNESS, HAUSTUER, facadeOpenings, facadePieces, rectShape, type Rect } from "./facade";
import { BINS, BUILDING_HEIGHT, ENTRANCE_X, FACADE_Z, STREET_SOLIDS, worldSolids } from "./layout";

const rectOf = (p: { center: readonly number[]; size: readonly number[] }): Rect => ({
  x0: p.center[0] - p.size[0] / 2,
  x1: p.center[0] + p.size[0] / 2,
  y0: p.center[1] - p.size[1] / 2,
  y1: p.center[1] + p.size[1] / 2,
});
const overlap = (a: Rect, b: Rect) =>
  Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
const area = (r: Rect) => (r.x1 - r.x0) * (r.y1 - r.y0);
const NO_LIDS = BINS.map(() => 0);
const inDoorway = (y: number) => new Vector3(ENTRANCE_X, y, FACADE_Z - FACADE_THICKNESS / 2);

describe("facade", () => {
  test("facade pieces never cover an opening", () => {
    for (const piece of facadePieces()) {
      for (const opening of facadeOpenings()) {
        expect(overlap(rectOf(piece), opening)).toBeLessThan(1e-9);
      }
    }
  });

  test("pieces and openings tile the wall exactly", () => {
    const pieces = facadePieces().map(rectOf);
    const total = pieces.reduce((sum, r) => sum + area(r), 0) + facadeOpenings().reduce((sum, r) => sum + area(r), 0);
    expect(total).toBeCloseTo(30 * BUILDING_HEIGHT, 6);
    for (let i = 0; i < pieces.length; i++) {
      for (let j = i + 1; j < pieces.length; j++) {
        expect(overlap(pieces[i], pieces[j])).toBeLessThan(1e-9);
      }
    }
  });

  test("the wall is still solid away from the openings", () => {
    const inWall = sphere("probe", new Vector3(5, 1.5, FACADE_Z - FACADE_THICKNESS / 2), 0.1);
    expect(STREET_SOLIDS.some((s) => s.kind !== "half" && collide(inWall, s) !== null)).toBe(true);
  });

  test("the shut Haustür fills the doorway, the open one leaves room to walk through", () => {
    const body = sphere("body", inDoorway(1.0), 0.4);
    expect(collide(body, doorLeaf(HAUSTUER, 0))).not.toBeNull();
    const blocking = worldSolids(NO_LIDS, 1.5).filter((s) => collide(body, s) !== null);
    expect(blocking.map((s) => s.name)).toEqual([]);
  });

  test("the Haustür opens inwards", () => {
    expect(doorLeaf(HAUSTUER, 1.0).center.z).toBeLessThan(FACADE_Z - FACADE_THICKNESS);
  });

  test("the doorway is the inside of the door frame", () => {
    expect(DOORWAY.x0).toBeCloseTo(ENTRANCE_X - 0.575, 9);
    expect(DOORWAY.x1).toBeCloseTo(ENTRANCE_X + 0.575, 9);
    expect(DOORWAY.y0).toBeCloseTo(0.15, 9);
    expect(DOORWAY.y1).toBeCloseTo(2.45, 9);
  });
});

describe("wall shapes", () => {
  test("a wall shape has exactly its openings cut out", () => {
    const outer: Rect = { x0: -2, x1: 3, y0: 0, y1: 4 };
    const holes: Rect[] = [
      { x0: -1, x1: 0, y0: 1, y1: 3 },
      { x0: 1, x1: 2.5, y0: 2, y1: 3.5 },
    ];
    const geometry = new ShapeGeometry(rectShape(outer, holes));
    const position = geometry.getAttribute("position");
    const index = geometry.getIndex()!;
    let total = 0;
    for (let i = 0; i < index.count; i += 3) {
      const [a, b, c] = [0, 1, 2].map((k) => new Vector3().fromBufferAttribute(position, index.getX(i + k)));
      total += b.clone().sub(a).cross(c.clone().sub(a)).length() / 2;
    }
    expect(total).toBeCloseTo(area(outer) - holes.reduce((sum, h) => sum + area(h), 0), 9);
  });
});
