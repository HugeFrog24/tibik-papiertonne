import { Vector3, type Matrix4 } from "three";
import { expect } from "vitest";
import { handPosition } from "../characters/skeleton";
import { KEY_GRIP, keyBowGrip, keyParts, type KeyName } from "../props/keyRingShape";
import { FACADE_Z } from "../street/building";
import { FACADE_THICKNESS, HAUSTUER } from "../street/facade";
import { asCharacter, type TibikFrame } from "../Tibik/character";
import { RIG } from "../Tibik/rig";
import { HOUSE_KEY_INSERT, outerCylinderAt, type Entry } from "./enterHouse";

export type AtTheDoor = {
  readonly tibik: TibikFrame;
  readonly keys: Matrix4 | null;
  readonly haustuer: number;
  readonly indoors: number;
};

const houseKey = () => keyParts().find((k) => k.name === "house")!;
const within = (frames: readonly number[], from: number, to: number) => frames.filter((t) => t >= from && t <= to);

export const expectGoesIn = (entry: Entry, at: (t: number) => AtTheDoor, frames: readonly number[]) => {
  const house = houseKey();
  const end = frames[frames.length - 1];
  const turns: Vector3[] = [];
  for (const t of within(frames, entry.unlock[0] + 0.25, entry.unlock[1])) {
    const state = at(t);
    const m = state.keys!;
    const tip = house.tip.clone().applyMatrix4(m);
    const axis = house.blade.axes[0].clone().transformDirection(m);
    const hole = outerCylinderAt(state.haustuer);
    const depth = tip.clone().sub(hole).dot(axis);
    const offAxis = tip.clone().sub(hole).addScaledVector(axis, -depth).length();
    expect(offAxis, t.toFixed(2)).toBeLessThan(0.004);
    expect(Math.abs(depth - HOUSE_KEY_INSERT), t.toFixed(2)).toBeLessThan(0.004);
    turns.push(house.blade.axes[1].clone().transformDirection(m));
  }
  expect(Math.min(...turns.map((u) => u.dot(turns[0])))).toBeLessThan(-0.95);
  expect(at(entry.unlock[0]).haustuer).toBe(0);
  expect(at(entry.backStep[0]).haustuer).toBe(0);
  expect(at(entry.backStep[1]).haustuer).toBeGreaterThan(0.35);
  const hinge = new Vector3(...HAUSTUER.hinge);
  for (const t of within(frames, entry.backStep[1], entry.in[0] + 1)) {
    const {
      tibik: {
        position: [x, , z],
      },
      haustuer,
    } = at(t);
    const bearing = Math.atan2(z - hinge.z, x - hinge.x);
    if (haustuer < bearing + 0.3) expect(Math.hypot(x - hinge.x, z - hinge.z), t.toFixed(2)).toBeGreaterThan(HAUSTUER.width + 0.38);
  }
  expect(Math.max(...within(frames, entry.unlock[1], end).map((t) => at(t).haustuer))).toBeGreaterThan(1.4);
  for (const t of within(frames, entry.doorShut, end)) expect(at(t).haustuer, t.toFixed(2)).toBe(0);
  const last = at(end);
  expect(last.indoors).toBe(1);
  expect(last.tibik.position[2]).toBeLessThan(FACADE_Z - FACADE_THICKNESS - 0.3);
  let indoors = 0;
  for (const t of frames) {
    const now = at(t).indoors;
    expect(now, t.toFixed(2)).toBeGreaterThanOrEqual(indoors);
    indoors = now;
  }
  expect(at(entry.in[0]).indoors).toBe(0);
};

export const expectKeyTurnsByHand = (entry: Entry, at: (t: number) => AtTheDoor, frames: readonly number[]) => {
  const house = houseKey();
  const upAt = (t: number) => house.blade.axes[1].clone().transformDirection(at(t).keys!);
  const turning = within(frames, entry.unlock[0], entry.keysInLock[1]);
  for (let i = 1; i < turning.length; i++) {
    const turned = (upAt(turning[i - 1]).angleTo(upAt(turning[i])) * 180) / Math.PI;
    expect(turned, turning[i].toFixed(2)).toBeLessThan(45);
  }
};

export const keysAwayFromFist = (at: (t: number) => AtTheDoor, frames: readonly number[], held: (t: number) => KeyName | null) => {
  const away: string[] = [];
  for (const t of frames) {
    const name = held(t);
    if (name === null) continue;
    const state = at(t);
    const grip = keyBowGrip(state.keys!, name, KEY_GRIP);
    const miss = grip.distanceTo(handPosition(RIG, asCharacter(state.tibik), "leftArm"));
    if (miss > 0.03) away.push(`${t.toFixed(2)} s: ${name} key ${(miss * 100).toFixed(1)} cm from his fist`);
  }
  return away;
};
