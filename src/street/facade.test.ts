import { Matrix4, ShapeGeometry, Vector3 } from "three";
import { describe, expect, test } from "vitest";
import { doorLeaf } from "../building/doors";
import { boxGap, collide, obb, sphere } from "../physics/collision";
import {
  DOORWAY,
  FACADE_THICKNESS,
  HAUSTUER,
  HAUSTUER_CLOSER,
  closerArm,
  facadeOpenings,
  facadePieces,
  rectShape,
  type Rect,
} from "./facade";
import {
  BINS,
  BUILDING_HEIGHT,
  ENTRANCE_X,
  FACADE_Z,
  STREET_SOLIDS,
  worldSolids,
} from "./layout";
import { overlap, rectOf } from "./streetChecks";

const area = (r: Rect) => (r.x1 - r.x0) * (r.y1 - r.y0);
const NO_LIDS = BINS.map(() => 0);
const inDoorway = (y: number) =>
  new Vector3(ENTRANCE_X, y, FACADE_Z - FACADE_THICKNESS / 2);

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
    const total =
      pieces.reduce((sum, r) => sum + area(r), 0) +
      facadeOpenings().reduce((sum, r) => sum + area(r), 0);
    expect(total).toBeCloseTo(30 * BUILDING_HEIGHT, 6);
    for (let i = 0; i < pieces.length; i++) {
      for (let j = i + 1; j < pieces.length; j++) {
        expect(overlap(pieces[i], pieces[j])).toBeLessThan(1e-9);
      }
    }
  });

  test("the wall is still solid away from the openings", () => {
    const inWall = sphere(
      "probe",
      new Vector3(5, 1.5, FACADE_Z - FACADE_THICKNESS / 2),
      0.1,
    );
    expect(
      STREET_SOLIDS.some(
        (s) => s.kind !== "half" && collide(inWall, s) !== null,
      ),
    ).toBe(true);
  });

  test("the shut Haustür fills the doorway, the open one leaves room to walk through", () => {
    const body = sphere("body", inDoorway(1.0), 0.4);
    expect(collide(body, doorLeaf(HAUSTUER, 0))).not.toBeNull();
    const blocking = worldSolids(NO_LIDS, 1.5).filter(
      (s) => collide(body, s) !== null,
    );
    expect(blocking.map((s) => s.name)).toEqual([]);
  });

  test("the Haustür opens outwards, towards the street, as German entrance doors do (escape route)", () => {
    expect(doorLeaf(HAUSTUER, 1.0).center.z).toBeGreaterThan(FACADE_Z);
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
      const [a, b, c] = [0, 1, 2].map((k) =>
        new Vector3().fromBufferAttribute(position, index.getX(i + k)),
      );
      total += b.clone().sub(a).cross(c.clone().sub(a)).length() / 2;
    }
    expect(total).toBeCloseTo(
      area(outer) - holes.reduce((sum, h) => sum + area(h), 0),
      9,
    );
  });
});

describe("the Haustür closer", () => {
  const angles = Array.from({ length: 16 }, (_, i) => i * 0.1);

  test("its arm keeps its length and its slider stays in the rail on the leaf, at any angle", () => {
    for (const a of angles) {
      const { spindle, slider, along } = closerArm(a);
      expect(spindle.distanceTo(slider), `${a.toFixed(1)} rad`).toBeCloseTo(
        HAUSTUER_CLOSER.armLength,
        6,
      );
      expect(along, `${a.toFixed(1)} rad`).toBeGreaterThanOrEqual(
        HAUSTUER_CLOSER.rail.from,
      );
      expect(along, `${a.toFixed(1)} rad`).toBeLessThanOrEqual(
        HAUSTUER_CLOSER.rail.to,
      );
    }
  });

  test("its body sits on the push side, under the head of the opening, just behind the shut leaf", () => {
    const { center, size } = HAUSTUER_CLOSER.body;
    expect(center[1] + size[1] / 2).toBeLessThanOrEqual(DOORWAY.y1 + 1e-9);
    expect(center[2] + size[2] / 2).toBeLessThan(HAUSTUER.hinge[2] - HAUSTUER.thickness / 2);
    expect(center[2] - size[2] / 2).toBeGreaterThan(FACADE_Z - FACADE_THICKNESS);
    expect(boxGap(obb("closer", new Matrix4(), size, center), doorLeaf(HAUSTUER, 0))).toBeGreaterThan(0);
  });
});
