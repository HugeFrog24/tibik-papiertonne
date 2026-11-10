import { Vector3 } from "three";
import { expect, test } from "vitest";
import { boxGap, partObb } from "../physics/collision";
import { HAUSTUER_WIDE } from "../scenes/enterHouse";
import { OUTLINE } from "../toon/primitives";
import { FLATS, RESIDENTS } from "./building";
import { haustuerSolids } from "./facade";
import {
  FLYER,
  MAILBOXES,
  MAILBOX_GRID,
  flyerBox,
  flyerFlapAngle,
  mailboxCell,
  mailboxFlapHinge,
  mailboxLockPx,
  mailboxPlate,
  mailboxSlot,
  mailboxTagPx,
} from "./layout";
import { MAILBOX_DOOR, mailboxDoorSolid, mailboxKeyhole } from "./mailboxDoorShape";

const mm = (px: number, axis: 0 | 1) => (px * [mailboxPlate().width, mailboxPlate().height][axis]) / MAILBOX_GRID.px[axis];

test("a 12-box unit with horizontal boxes like KNOBLOCH's: 2 columns by 6 rows, 755 x 666 x 270 mm, each door about 370 x 110 mm", () => {
  expect(MAILBOXES.size).toEqual([0.755, 0.666, 0.27]);
  expect([MAILBOX_GRID.cols, MAILBOX_GRID.rows]).toEqual([2, 6]);
  expect(MAILBOX_GRID.cols * MAILBOX_GRID.rows).toBe(RESIDENTS.length);
  const { w, h } = mailboxCell(0);
  expect(Math.abs(mm(w, 0) - 0.37)).toBeLessThan(0.005);
  expect(Math.abs(mm(h, 1) - 0.11)).toBeLessThan(0.005);
});

test("one row per storey, the top storey at the top, links on the left and rechts on the right", () => {
  RESIDENTS.forEach((name, i) => {
    const flat = FLATS.find((f) => f.name === name)!;
    const cell = mailboxCell(i);
    expect(Math.round(cell.y / cell.h), name).toBe(5 - flat.storey);
    expect(Math.round(cell.x / cell.w), name).toBe(flat.side === "links" ? 0 : 1);
  });
});

test("each slot is 335 x 33 mm under a full-width flap hinged at its top, and sits 0.70-1.70 m above the pavement (EN 13724)", () => {
  expect(MAILBOX_GRID.slot.width).toBe(335);
  expect(MAILBOX_GRID.slot.height).toBe(33);
  const { slot, flap } = MAILBOX_GRID;
  expect(flap.width).toBeGreaterThanOrEqual(slot.width + 10);
  expect(flap.width).toBeLessThan(mailboxCell(0).w);
  expect(flap.top).toBeLessThan(slot.top);
  expect(flap.top + flap.height).toBeGreaterThan(slot.top + slot.height);
  for (const name of RESIDENTS) {
    const [, y] = mailboxSlot(name);
    expect(y, name).toBeGreaterThanOrEqual(0.7);
    expect(y, name).toBeLessThanOrEqual(1.7);
    const hinge = mailboxFlapHinge(name);
    expect(hinge[1], name).toBeGreaterThan(y);
  }
});

test("the lock sits at the bottom right of each door, by its free edge, and the name tag at the bottom left", () => {
  RESIDENTS.forEach((_, i) => {
    const cell = mailboxCell(i);
    const lock = mailboxLockPx(cell);
    const tag = mailboxTagPx(cell);
    expect(lock.x).toBeGreaterThan(cell.x + (3 * cell.w) / 4);
    expect(lock.y).toBeGreaterThan(cell.y + cell.h / 2);
    expect(tag.x + tag.w).toBeLessThan(cell.x + cell.w / 2);
    expect(tag.y).toBeGreaterThan(cell.y + cell.h / 2);
  });
  const key = new Vector3(...mailboxKeyhole());
  const door = mailboxDoorSolid(0);
  expect(MAILBOX_DOOR.hinge).toBe("left");
  expect(key.x).toBeGreaterThan(door.center.x + door.half[0] / 2);
  expect(key.y).toBeLessThan(door.center.y);
});

test("Krause's flap rests propped open on the flyer: lifted, its lip just in front of the flyer", () => {
  const angle = flyerFlapAngle();
  expect(angle).toBeGreaterThan(0.1);
  expect(angle).toBeLessThan(Math.PI / 2);
  const hinge = new Vector3(...mailboxFlapHinge(FLYER.resident));
  const length = mm(MAILBOX_GRID.flap.height, 1);
  const lip = hinge.clone().add(new Vector3(0, -length * Math.cos(angle), length * Math.sin(angle)));
  const { top, bottom } = flyerBox();
  const a = new Vector3(...top);
  const along = new Vector3(...bottom).sub(a).normalize();
  const outward = new Vector3(0, along.z, -along.y);
  const gap = lip.clone().sub(a).dot(outward);
  expect(gap).toBeGreaterThan(FLYER.size[2] / 2);
  expect(gap).toBeLessThan(FLYER.size[2] / 2 + 0.006);
});

test("the Haustür swung as wide as the film ever opens it clears the mailbox unit beside it, outlines included", () => {
  const unit = partObb(MAILBOXES);
  for (let k = 0; k <= 40; k++) {
    const angle = (HAUSTUER_WIDE * k) / 40;
    for (const s of haustuerSolids(angle)) expect(boxGap(s, unit), `${s.name} at ${angle.toFixed(2)}`).toBeGreaterThanOrEqual(OUTLINE);
  }
});
