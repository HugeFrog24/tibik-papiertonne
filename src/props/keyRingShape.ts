import { Matrix4, Quaternion, Vector3 } from "three";
import type { Vec3 } from "../toon/primitives";
import { inWindow } from "../characters/scalar";

export const KEY_APPROACH = 0.25;
const KEY_SLIDE = 0.02;

export const keyDepthAt = (
  t: number,
  inserting: readonly [number, number],
  withdrawing: readonly [number, number],
  insert: number,
) =>
  insert -
  (insert + KEY_SLIDE) *
    Math.max(1 - inWindow(t, inserting), inWindow(t, withdrawing));

export const KEY_RING = {
  ring: { radius: 0.013, tube: 0.0012 },
  ink: 0.001,
  keys: [
    {
      name: "mailbox",
      at: -Math.PI / 2 - 0.65,
      bow: { radius: 0.0075, tube: 0.0016 },
      blade: [0.022, 0.0055, 0.0018] as Vec3,
      colour: "#c9c3b1",
    },
    {
      name: "house",
      at: -Math.PI / 2 + 0.65,
      bow: { radius: 0.0095, tube: 0.002 },
      blade: [0.03, 0.0075, 0.0022] as Vec3,
      colour: "#b9975b",
    },
  ],
} as const;

export type KeyName = (typeof KEY_RING.keys)[number]["name"];

export const keyParts = () =>
  KEY_RING.keys.map((key) => {
    const radial = new Vector3(Math.cos(key.at), Math.sin(key.at), 0);
    const tangent = new Vector3(-Math.sin(key.at), Math.cos(key.at), 0);
    const up = new Vector3(0, 0, 1);
    const centre = radial.clone().multiplyScalar(KEY_RING.ring.radius);
    const [length, width, thickness] = key.blade;
    const root = key.bow.radius - key.bow.tube / 2;
    const bladeCentre = centre
      .clone()
      .addScaledVector(radial, root + length / 2);
    return {
      name: key.name,
      colour: key.colour,
      bow: {
        centre,
        u: radial,
        v: up,
        axis: tangent,
        radius: key.bow.radius,
        tube: key.bow.tube,
      },
      blade: {
        centre: bladeCentre,
        axes: [radial, up, tangent] as const,
        size: [length, width, thickness] as const,
      },
      tip: bladeCentre.clone().addScaledVector(radial, length / 2),
    };
  });

export const KEY_GRIP = 0.07;

const keyNamed = (name: KeyName) => keyParts().find((k) => k.name === name)!;

export const keyInLock = (
  lock: Matrix4,
  hole: Vector3,
  name: KeyName,
  depth: number,
  turn: number,
): Matrix4 => {
  const key = keyNamed(name);
  const into = new Vector3(0, 0, -1);
  const up = new Vector3(Math.sin(turn), Math.cos(turn), 0);
  const side = up.clone().cross(into);
  const tip = hole.clone().addScaledVector(into, depth);
  return lock
    .clone()
    .multiply(new Matrix4().makeTranslation(tip.x, tip.y, tip.z))
    .multiply(new Matrix4().makeBasis(into, up, side))
    .multiply(new Matrix4().makeBasis(...key.blade.axes).invert())
    .multiply(new Matrix4().makeTranslation(-key.tip.x, -key.tip.y, -key.tip.z));
};

export const keyBowGrip = (ring: Matrix4, name: KeyName, off: number) => {
  const key = keyNamed(name);
  const outward = key.blade.axes[0].clone().transformDirection(ring).negate();
  return key.bow.centre.clone().applyMatrix4(ring).addScaledVector(outward, off);
};

export const keyRingAt = (
  hand: Vector3,
  orientation: Quaternion,
  name: KeyName,
  off: number,
): Matrix4 => {
  const key = keyNamed(name);
  const held = key.bow.centre.clone().addScaledVector(key.blade.axes[0], -off);
  return new Matrix4().compose(
    hand.clone().sub(held.applyQuaternion(orientation)),
    orientation,
    new Vector3(1, 1, 1),
  );
};
