import { Matrix4 } from "three";
import { expect, test } from "vitest";
import {
  boxGap,
  contacts,
  frame,
  obb,
  obbCorners,
} from "../physics/collision";
import { floorLevel } from "../street/building";
import {
  ROSE,
  doorLeaf,
  doorSolids,
  fittingSolids,
  leverParts,
  leverPivot,
  lockOf,
} from "./doors";
import { FLUR_SOLIDS } from "./flurShape";
import {
  LIVING_DOOR,
  LIVING_FRAME,
  LIVING_FURNITURE,
  LIVING_ROOM,
  livingDoorLeaf,
  livingFrameParts,
} from "./livingRoomShape";
import {
  FLUR,
  FLUR_FAR_WALL,
  LIVING_DOORWAY,
  STAIRWELL_WALLS,
} from "./stairwell";

const floor = floorLevel(1);

test("the Flur's far wall has a doorway to the living room, the size of a standard interior door", () => {
  const width = LIVING_DOORWAY.x1 - LIVING_DOORWAY.x0;
  expect(width).toBeCloseTo(0.885, 3);
  expect(LIVING_DOORWAY.height).toBeCloseTo(2.01, 3);
  const passage = obb(
    "passage",
    frame(new Matrix4(), [
      (LIVING_DOORWAY.x0 + LIVING_DOORWAY.x1) / 2,
      floor + LIVING_DOORWAY.height / 2,
      FLUR.z1 + 0.1,
    ]),
    [width - 0.01, LIVING_DOORWAY.height - 0.01, 0.6],
  );
  expect(
    contacts([passage], [...STAIRWELL_WALLS, ...FLUR_SOLIDS]).map((c) => c.b),
  ).toEqual([]);
});

test("the living-room door only ever swings into the living room", () => {
  for (let a = 0; a <= LIVING_DOOR.open + 1e-9; a += 0.05)
    for (const p of obbCorners(livingDoorLeaf(a)))
      expect(p.z).toBeGreaterThanOrEqual(LIVING_ROOM.z0 - 1e-6);
  expect(LIVING_DOOR.open).toBeGreaterThan(Math.PI / 2);
});

test("standing open, the door touches nothing in the living room", () => {
  const solids = LIVING_FURNITURE.map((p) =>
    obb(p.name, frame(new Matrix4(), p.center), p.size),
  );
  expect(contacts([livingDoorLeaf(LIVING_DOOR.open)], solids)).toEqual([]);
});

test("the living-room door has an L-lever on each face, 1050 mm above the floor and 55 mm in from its latch edge, each on a round rose, with a Buntbart key rosette 72 mm below", () => {
  const levers = LIVING_DOOR.grips.filter((g) => g.shape === "lever");
  expect(levers.map((g) => Math.sign(g.center[2])).sort()).toEqual([-1, 1]);
  for (const g of levers) {
    expect(LIVING_DOOR.hinge[1] + g.center[1] - floor).toBeCloseTo(1.05, 3);
    expect(LIVING_DOOR.width - leverPivot(g)[0]).toBeCloseTo(0.055, 6);
  }
  const lock = lockOf(LIVING_DOOR)!;
  expect(lock.spindle[1] - lock.hole[1]).toBeCloseTo(0.072, 9);
  const leaf = doorLeaf(LIVING_DOOR, 0);
  const fittings = fittingSolids(LIVING_DOOR, 0);
  expect(fittings.map((o) => o.name).sort()).toEqual(
    ["inner rose", "inner key rosette", "outer rose", "outer key rosette"]
      .map((n) => `${LIVING_DOOR.name} ${n}`)
      .sort(),
  );
  for (const f of fittings) {
    expect(boxGap(f, leaf), f.name).toBeGreaterThan(-1e-9);
    expect(boxGap(f, leaf), f.name).toBeLessThan(0.001);
  }
  expect(2 * ROSE.radius).toBeGreaterThanOrEqual(0.05);
  expect(2 * ROSE.radius).toBeLessThanOrEqual(0.055);
  for (const side of ["inner", "outer"] as const) {
    const { mount, neck } = leverParts(LIVING_DOOR, 0, side);
    expect(mount.name).toBe(`${LIVING_DOOR.name} ${side} rose`);
    expect(boxGap(neck, mount), side).toBeLessThan(0.001);
  }
});

test("standing open, the door and its handles touch nothing in the living room and stay inside it", () => {
  const solids = doorSolids(LIVING_DOOR, LIVING_DOOR.open);
  const around = [
    ...LIVING_FURNITURE.map((p) =>
      obb(p.name, frame(new Matrix4(), p.center), p.size),
    ),
    ...livingFrameParts().map(solidOf),
  ];
  expect(contacts(solids, around)).toEqual([]);
  for (const s of solids)
    for (const p of obbCorners(s)) {
      expect(p.x, s.name).toBeLessThanOrEqual(LIVING_ROOM.x1);
      expect(p.z, s.name).toBeGreaterThanOrEqual(LIVING_ROOM.z0 - 1e-6);
    }
});

test("the living-room furniture stands on its floor or hangs on its far wall, inside the room, without overlapping", () => {
  const solids = LIVING_FURNITURE.map((p) =>
    obb(p.name, frame(new Matrix4(), p.center), p.size),
  );
  for (const p of LIVING_FURNITURE) {
    const [x, y, z] = p.center;
    const [w, h, d] = p.size;
    expect(x - w / 2, p.name).toBeGreaterThanOrEqual(LIVING_ROOM.x0 - 1e-9);
    expect(x + w / 2, p.name).toBeLessThanOrEqual(LIVING_ROOM.x1 + 1e-9);
    expect(z - d / 2, p.name).toBeGreaterThanOrEqual(LIVING_ROOM.z0 - 1e-9);
    expect(z + d / 2, p.name).toBeLessThanOrEqual(LIVING_ROOM.z1 + 1e-9);
    const onFloor = Math.abs(y - h / 2 - floor) < 0.005;
    const onWall = Math.abs(z + d / 2 - LIVING_ROOM.z1) < 0.005;
    expect(onFloor || onWall, p.name).toBe(true);
  }
  solids.forEach((s, i) =>
    expect(
      contacts([s], solids.slice(i + 1)).filter((c) => c.depth > 0.002),
      s.name,
    ).toEqual([]),
  );
  const names = LIVING_FURNITURE.map((p) => p.name).join(" ");
  for (const thing of [
    "tall unit",
    "base unit",
    "worktop",
    "wall unit",
    "sofa",
  ])
    expect(names).toContain(thing);
});

const solidOf = (p: {
  readonly name: string;
  readonly center: readonly number[];
  readonly size: readonly number[];
}) =>
  obb(p.name, frame(new Matrix4(), [p.center[0], p.center[1], p.center[2]]), [
    p.size[0],
    p.size[1],
    p.size[2],
  ]);

test("a DIN 18101 frame lines the doorway, with 60 mm casings on both faces and an 841 × 1972 mm clear opening", () => {
  const parts = livingFrameParts();
  const casings = parts.filter((p) => p.name.includes("casing"));
  expect(casings).toHaveLength(6);
  for (const c of casings)
    expect(Math.min(c.size[0], c.size[1]), c.name).toBeCloseTo(
      LIVING_FRAME.casing,
      6,
    );
  const middle = (FLUR.z1 + LIVING_ROOM.z0) / 2;
  const faces = new Set(casings.map((c) => Math.sign(c.center[2] - middle)));
  expect([...faces].sort()).toEqual([-1, 1]);
  const linings = parts.filter((p) => p.name.includes("lining"));
  const edge = (name: string, pick: (p: (typeof parts)[number]) => number) =>
    pick(linings.find((p) => p.name.includes(name))!);
  const x0 = edge("latch", (p) => p.center[0] + p.size[0] / 2);
  const x1 = edge("hinge", (p) => p.center[0] - p.size[0] / 2);
  const top = edge("head", (p) => p.center[1] - p.size[1] / 2);
  expect(x1 - x0).toBeCloseTo(0.841, 3);
  expect(top - floor).toBeCloseTo(1.972, 3);
  for (const p of parts) {
    expect(p.center[0] - p.size[0] / 2, p.name).toBeGreaterThanOrEqual(
      LIVING_DOORWAY.x0 - LIVING_FRAME.casing - 1e-9,
    );
    expect(p.center[0] + p.size[0] / 2, p.name).toBeLessThanOrEqual(
      LIVING_DOORWAY.x1 + LIVING_FRAME.casing + 1e-9,
    );
  }
  expect(
    contacts([livingDoorLeaf(LIVING_DOOR.open)], parts.map(solidOf)),
  ).toEqual([]);
});

test("the Flur's far wall around the doorway is one flat surface, tiled without overlaps", () => {
  for (const w of FLUR_FAR_WALL)
    expect(w.center.z - w.half[2]).toBeCloseTo(FLUR.z1, 9);
  const area = FLUR_FAR_WALL.reduce(
    (sum, w) => sum + 4 * w.half[0] * w.half[1],
    0,
  );
  const doorway =
    (LIVING_DOORWAY.x1 - LIVING_DOORWAY.x0) * LIVING_DOORWAY.height;
  expect(area).toBeCloseTo((FLUR.x1 - FLUR.x0) * FLUR.height - doorway, 6);
  FLUR_FAR_WALL.forEach((w, i) =>
    expect(
      contacts([w], FLUR_FAR_WALL.slice(i + 1)).filter((c) => c.depth > 1e-6),
    ).toEqual([]),
  );
});
