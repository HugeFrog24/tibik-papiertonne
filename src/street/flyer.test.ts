import { Euler, Vector3 } from "three";
import { expect, test } from "vitest";
import { RESIDENTS } from "./building";
import {
  FLYER,
  MAILBOXES,
  MAILBOX_GRID,
  flyerBox,
  flyerPose,
  mailboxPlate,
  mailboxSlot,
} from "./layout";

test("an advertising flyer sticks out of a neighbour's mailbox: not Tibik's, which waits for the Hausverwaltung's letter, and not the one that says 'Bitte keine Werbung!'", () => {
  expect(RESIDENTS).toContain(FLYER.resident);
  expect(FLYER.resident).not.toBe("Tibik");
  expect(FLYER.resident).not.toBe("Schulz");
});

test("every resident's slot lies on the painted plate of the mailbox unit, in the row and column of their box; an unknown name has no slot", () => {
  const { plate } = mailboxPlate();
  const [w, h] = MAILBOXES.size;
  for (const name of RESIDENTS) {
    const slot = mailboxSlot(name);
    expect(slot[2]).toBeCloseTo(plate, 9);
    expect(Math.abs(slot[0] - MAILBOXES.center[0])).toBeLessThan(w / 2);
    expect(Math.abs(slot[1] - MAILBOXES.center[1])).toBeLessThan(h / 2);
  }
  expect(mailboxSlot(RESIDENTS[0])[1]).toBeGreaterThan(
    mailboxSlot(RESIDENTS[RESIDENTS.length - 1])[1],
  );
  expect(() => mailboxSlot("Nobody")).toThrow();
});

test("the flyer hangs from its slot down the front of the box, its top behind the plate but in front of the metal", () => {
  const slot = mailboxSlot(FLYER.resident);
  const { face, plate } = mailboxPlate();
  const box = flyerBox();
  expect(box.top[1]).toBeCloseTo(slot[1], 9);
  expect(box.top[2]).toBeLessThan(plate);
  expect(box.top[2] - FLYER.size[2] / 2).toBeGreaterThan(face);
  expect(box.bottom[2]).toBeGreaterThan(plate);
  expect(box.bottom[1]).toBeGreaterThan(
    MAILBOXES.center[1] - MAILBOXES.size[1] / 2,
  );
  expect(Math.abs(box.top[0] - slot[0])).toBeLessThan(1e-9);
});

test("the flyer comes out through the painted slot itself, not through the plate below it", () => {
  const slot = mailboxSlot(FLYER.resident);
  const { plate, height } = mailboxPlate();
  const { top, bottom } = flyerBox();
  const s = (plate - top[2]) / (bottom[2] - top[2]);
  const crossing = top[1] + s * (bottom[1] - top[1]);
  const half = ((MAILBOX_GRID.slot.height / 2) * height) / MAILBOX_GRID.px[1];
  expect(Math.abs(crossing - slot[1]) + FLYER.size[2] / 2).toBeLessThan(half);
});

test("the drawn flyer's pose puts its top edge at the slot and its bottom edge out and down", () => {
  const { position, rotation, size } = flyerPose();
  const turn = new Euler(...rotation);
  const edge = (sign: number) =>
    new Vector3(0, (sign * size[1]) / 2, 0)
      .applyEuler(turn)
      .add(new Vector3(...position));
  const { top, bottom } = flyerBox();
  expect(edge(1).distanceTo(new Vector3(...top))).toBeLessThan(1e-9);
  expect(edge(-1).distanceTo(new Vector3(...bottom))).toBeLessThan(1e-9);
});
