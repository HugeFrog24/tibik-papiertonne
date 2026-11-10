import { doorFrame, doorLeaf, roomDoor, type Door } from "./doors";
import { floorLevel, toPart, type Part } from "../street/building";
import { DOOR_FRAME, doorwayFrameParts } from "./doorwayFrame";
import { FLUR, LIVING_DOORWAY } from "./stairwell";

const floor = floorLevel(1);
const WALL = 0.2;

export const LIVING_ROOM = {
  x0: -6.4,
  x1: FLUR.x1,
  z0: FLUR.z1 + WALL,
  z1: -4.2,
  height: FLUR.height,
};

export const LIVING_DOOR: Door & {
  readonly open: number;
  readonly glass: {
    readonly x: number;
    readonly bottom: number;
    readonly top: number;
    readonly inset: number;
  };
} = {
  ...roomDoor("living-room door", [LIVING_DOORWAY.x1 - 0.0125, floor + 0.01, LIVING_ROOM.z0 + 0.022]),
  open: 1.65,
  glass: { x: 0.14, bottom: 0.62, top: 0.2, inset: 0.012 },
};

const livingGlassHeight = LIVING_DOOR.height - LIVING_DOOR.glass.bottom - LIVING_DOOR.glass.top;

export const LIVING_GLASS = {
  x: LIVING_DOOR.width / 2,
  y: LIVING_DOOR.glass.bottom + livingGlassHeight / 2,
  w: LIVING_DOOR.width - 2 * LIVING_DOOR.glass.x,
  h: livingGlassHeight,
  opacity: 0.5,
};

export const livingDoorFrame = (angle: number) =>
  doorFrame(LIVING_DOOR, angle);

export const livingDoorLeaf = (angle: number) => doorLeaf(LIVING_DOOR, angle);

const far = LIVING_ROOM.z1;

export const TALL_UNIT = {
  name: "tall unit",
  center: [-3.7, floor + 1.05, far - 0.29],
  size: [0.5, 2.1, 0.58],
} as const;

export const BASE_UNIT = {
  name: "base unit",
  center: [-4.195, floor + 0.43, far - 0.29],
  size: [0.45, 0.86, 0.58],
} as const;

export const WORKTOP = {
  name: "worktop",
  center: [-4.195, floor + 0.88, far - 0.31],
  size: [0.47, 0.04, 0.62],
} as const;

export const WALL_UNIT = {
  name: "wall unit",
  center: [-4.195, floor + 1.72, far - 0.17],
  size: [0.45, 0.55, 0.34],
} as const;

export const SOFA = {
  name: "sofa",
  center: [-5.4, floor + 0.475, far - 0.475],
  size: [1.8, 0.95, 0.95],
  seat: 0.45,
} as const;

export const CHAISE = {
  name: "sofa chaise",
  center: [-5.8, floor + 0.225, far - 0.95 - 0.375],
  size: [1.0, 0.45, 0.75],
} as const;

export const LIVING_FURNITURE: readonly Part[] = [
  TALL_UNIT,
  BASE_UNIT,
  WORKTOP,
  WALL_UNIT,
  SOFA,
  CHAISE,
].map(toPart);

export const LIVING_FRAME = DOOR_FRAME;

export const livingFrameParts = (): readonly Part[] =>
  doorwayFrameParts(LIVING_DOORWAY, floor, [FLUR.z1, LIVING_ROOM.z0], [
    ["Flur", [FLUR.z1 - DOOR_FRAME.trim, FLUR.z1]],
    ["living-room", [LIVING_ROOM.z0, LIVING_ROOM.z0 + DOOR_FRAME.trim]],
  ]);
