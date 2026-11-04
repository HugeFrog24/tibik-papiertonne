import { Matrix4, Vector3 } from "three";
import { expect, test } from "vitest";
import { boxGap, obb, type Obb } from "../physics/collision";
import { DL } from "../props/letterShape";
import {
  DOORBELL_PANEL,
  MAILBOXES,
  MAILBOX_GRID,
  RESIDENTS,
  STREET_PARTS,
  mailboxCell,
  mailboxCellOf,
  mailboxPlate,
} from "./layout";
import {
  MAILBOX_DOOR,
  mailboxDoorInked,
  mailboxDoorSolid,
  mailboxInside,
  mailboxKeyhole,
} from "./mailboxDoorShape";

const TIBIK = RESIDENTS.indexOf(MAILBOX_DOOR.resident);
const PLATE_SHEET = 0.0005;

const cellRect = (i: number) => {
  const { x, y, w, h } = mailboxCell(i);
  const { width, height } = mailboxPlate();
  const [px, py] = MAILBOX_GRID.px;
  const [cx, cy] = MAILBOXES.center;
  return {
    x0: cx + (x / px - 0.5) * width,
    x1: cx + ((x + w) / px - 0.5) * width,
    y0: cy + (0.5 - (y + h) / py) * height,
    y1: cy + (0.5 - y / py) * height,
  };
};

const cellSolid = (i: number): Obb => {
  const r = cellRect(i);
  return obb(
    `mailbox ${i}`,
    new Matrix4().makeTranslation(
      (r.x0 + r.x1) / 2,
      (r.y0 + r.y1) / 2,
      mailboxPlate().plate - PLATE_SHEET / 2,
    ),
    [r.x1 - r.x0, r.y1 - r.y0, PLATE_SHEET],
  );
};

const corners = (box: Obb) =>
  [-1, 1].flatMap((sx) =>
    [-1, 1].flatMap((sy) =>
      [-1, 1].map((sz) =>
        box.center
          .clone()
          .addScaledVector(box.axes[0], sx * box.half[0])
          .addScaledVector(box.axes[1], sy * box.half[1])
          .addScaledVector(box.axes[2], sz * box.half[2]),
      ),
    ),
  );

test("the door is Tibik's box: row 3 right, over its painted cell", () => {
  expect(TIBIK).toBe(8);
  expect(TIBIK % MAILBOX_GRID.cols).toBe(MAILBOX_GRID.cols - 1);
  expect(Math.floor(TIBIK / MAILBOX_GRID.cols)).toBe(2);
  const door = corners(mailboxDoorSolid(0));
  const cell = cellRect(TIBIK);
  const xs = door.map((p) => p.x);
  const ys = door.map((p) => p.y);
  expect(Math.abs(Math.min(...xs) - cell.x0)).toBeLessThan(0.001);
  expect(Math.abs(Math.max(...xs) - cell.x1)).toBeLessThan(0.001);
  expect(Math.abs(Math.min(...ys) - cell.y0)).toBeLessThan(0.001);
  expect(Math.abs(Math.max(...ys) - cell.y1)).toBeLessThan(0.001);
  const proud = Math.min(...door.map((p) => p.z)) - mailboxPlate().plate;
  expect(proud).toBeGreaterThanOrEqual(0.0005);
  expect(proud).toBeLessThanOrEqual(0.002);
});

const AROUND: readonly Obb[] = [
  ...RESIDENTS.map((_, i) => i)
    .filter((i) => i !== TIBIK)
    .map(cellSolid),
  ...STREET_PARTS.map((p) =>
    obb(p.name, new Matrix4().makeTranslation(...p.center), p.size),
  ),
];

test("it opens on its left hinge, clear of its neighbours, the unit, the facade and the doorbell panel, outline included", () => {
  expect(MAILBOX_DOOR.hinge).toBe("left");
  expect(AROUND.some((s) => s.name === DOORBELL_PANEL.name)).toBe(true);
  for (let k = 0; k <= 40; k++) {
    const a = (MAILBOX_DOOR.open * k) / 40;
    const door = mailboxDoorSolid(a);
    for (const s of AROUND)
      expect(boxGap(door, s), `${s.name} at ${a.toFixed(3)} rad`).toBeGreaterThanOrEqual(
        MAILBOX_DOOR.ink,
      );
  }
  const free = corners(mailboxDoorSolid(MAILBOX_DOOR.open)).map((p) => p.z);
  expect(Math.max(...free)).toBeGreaterThan(mailboxPlate().plate + 0.2);
});

test("its hinge stops it at about 100 degrees, wide enough to reach in", () => {
  expect(MAILBOX_DOOR.open).toBeGreaterThanOrEqual(1.4);
  expect(MAILBOX_DOOR.open).toBeLessThanOrEqual((100 * Math.PI) / 180 + 1e-9);
  expect(Math.round(MAILBOX_DOOR.open / 0.05) * 0.05).toBeCloseTo(MAILBOX_DOOR.open, 9);
});

test("it swings out from its left hinge towards the street", () => {
  const closed = mailboxDoorSolid(0);
  const half = mailboxDoorSolid(MAILBOX_DOOR.open / 2);
  expect(half.center.z).toBeGreaterThan(closed.center.z + 0.05);
  expect(half.center.x).toBeLessThan(closed.center.x);
  expect(half.center.x).toBeGreaterThan(cellRect(TIBIK).x0);
});

test("the lock sits near the free edge where a key can reach it", () => {
  const key = new Vector3(...mailboxKeyhole());
  const door = mailboxDoorSolid(0);
  const right = door.center.x + door.half[0];
  expect(right - key.x).toBeGreaterThan(0);
  expect(right - key.x).toBeLessThan(0.03);
  const face = door.center.z + door.half[2];
  expect(key.z - face).toBeGreaterThanOrEqual(0.0005);
  expect(key.z - face).toBeLessThanOrEqual(0.002);
  expect(Math.abs(key.y - door.center.y)).toBeLessThan(door.half[1]);
});

test("the envelope fits inside the box, standing on its long edge", () => {
  const { center, size } = mailboxInside();
  expect(size[0]).toBeGreaterThanOrEqual(DL[0] + 0.005);
  expect(size[1]).toBeGreaterThanOrEqual(DL[1] + 0.005);
  expect(size[2]).toBeGreaterThan(0.05);
  const cell = cellRect(TIBIK);
  expect(center[0] - size[0] / 2).toBeGreaterThanOrEqual(cell.x0 - 1e-9);
  expect(center[0] + size[0] / 2).toBeLessThanOrEqual(cell.x1 + 1e-9);
  expect(center[2] + size[2] / 2).toBeLessThanOrEqual(mailboxPlate().plate);
  expect(center[2] - size[2] / 2).toBeGreaterThanOrEqual(
    MAILBOXES.center[2] - MAILBOXES.size[2] / 2,
  );
});

test("closed, it is drawn like its painted neighbours, without the outline pass; once it opens it is outlined like any object", () => {
  expect(mailboxDoorInked(0)).toBe(false);
  expect(mailboxDoorInked(0.01)).toBe(true);
  expect(mailboxDoorInked(MAILBOX_DOOR.open)).toBe(true);
});

test("a mailbox is found by its resident's name, and asking for someone who doesn't live here fails loudly", () => {
  expect(mailboxCellOf(MAILBOX_DOOR.resident)).toEqual(mailboxCell(8));
  expect(() => mailboxCellOf("Nobody")).toThrow(/No mailbox for Nobody/);
});
