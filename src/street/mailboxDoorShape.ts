import { Vector3 } from "three";
import { doorFrame, doorLeaf, type Door } from "../building/doors";
import type { Vec3 } from "../toon/primitives";
import {
  MAILBOXES,
  mailboxCellOf,
  mailboxLockPx,
  mailboxMetresPerPx,
  mailboxPlate,
  platePoint,
} from "./layout";

const HINGE_STOP = (100 * Math.PI) / 180;

export const MAILBOX_DOOR = {
  resident: "Tibik",
  hinge: "left" as const,
  open: Math.floor(HINGE_STOP / 0.05) * 0.05,
  thickness: 0.002,
  lift: 0.0012,
  ink: 0.001,
  lock: { radius: 0.007, proud: 0.001 },
  wall: 0.001,
};

const cell = () => {
  const { x, y, w, h } = mailboxCellOf(MAILBOX_DOOR.resident);
  const [x0, y1] = platePoint(x, y);
  const [x1, y0] = platePoint(x + w, y + h);
  return { x0, x1, y0, y1 };
};

export const MAILBOX_DOOR_SPEC: Door = (() => {
  const { x0, x1, y0, y1 } = cell();
  return {
    name: `${MAILBOX_DOOR.resident}'s mailbox door`,
    hinge: [
      x0,
      y0,
      mailboxPlate().plate + MAILBOX_DOOR.lift + MAILBOX_DOOR.thickness / 2,
    ],
    width: x1 - x0,
    height: y1 - y0,
    thickness: MAILBOX_DOOR.thickness,
    closedYaw: 0,
    swing: -1,
    grips: [],
  };
})();

export const mailboxDoorFrame = (angle: number) =>
  doorFrame(MAILBOX_DOOR_SPEC, angle);

export const mailboxDoorSolid = (angle: number) =>
  doorLeaf(MAILBOX_DOOR_SPEC, angle);

export const mailboxLockLocal = (): Vec3 => {
  const cell = mailboxCellOf(MAILBOX_DOOR.resident);
  const lock = mailboxLockPx(cell);
  const [sx, sy] = mailboxMetresPerPx();
  return [(lock.x - cell.x) * sx, (cell.y + cell.h - lock.y) * sy, MAILBOX_DOOR.thickness / 2 + MAILBOX_DOOR.lock.proud];
};

export const mailboxKeyhole = (): Vec3 => {
  const p = new Vector3(...mailboxLockLocal()).applyMatrix4(
    mailboxDoorFrame(0),
  );
  return [p.x, p.y, p.z];
};

export const mailboxInside = (): { center: Vec3; size: Vec3 } => {
  const { x0, x1, y0, y1 } = cell();
  const { wall } = MAILBOX_DOOR;
  const back = MAILBOXES.center[2] - MAILBOXES.size[2] / 2 + wall;
  const front = mailboxPlate().face - wall;
  return {
    center: [(x0 + x1) / 2, (y0 + y1) / 2, (back + front) / 2],
    size: [x1 - x0 - 2 * wall, y1 - y0 - 2 * wall, front - back],
  };
};

export const mailboxDoorInked = (angle: number) => angle > 0;
