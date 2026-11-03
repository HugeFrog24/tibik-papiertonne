import { Euler, Matrix4, Vector3 } from "three";
import { frame, obb, type Obb } from "../physics/collision";
import type { Vec3 } from "../toon/primitives";

export type Door = {
  readonly name: string;
  readonly hinge: Vec3;
  readonly width: number;
  readonly height: number;
  readonly thickness: number;
  readonly closedYaw: number;
  readonly swing: 1 | -1;
  readonly handle: { readonly x: number; readonly y: number };
};

export const doorFrame = (door: Door, angle: number): Matrix4 =>
  frame(new Matrix4(), door.hinge, new Euler(0, door.closedYaw + door.swing * angle, 0));

export const doorLeaf = (door: Door, angle: number): Obb =>
  obb(door.name, doorFrame(door, angle), [door.width, door.height, door.thickness], [door.width / 2, door.height / 2, 0]);

export const doorHandle = (door: Door, angle: number, side: 1 | -1): Vector3 =>
  new Vector3(door.handle.x, door.handle.y, side * (door.thickness / 2 + 0.04)).applyMatrix4(doorFrame(door, angle));
