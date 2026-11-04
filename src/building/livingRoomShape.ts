import { doorFrame, doorLeaf, leverGrip, type Door } from "./doors";
import { floorLevel, type Part } from "../street/building";
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

const ROOM_DOOR = { width: 0.86, thickness: 0.04, backset: 0.055, lever: 1.04 };

export const LIVING_DOOR: Door & {
  readonly open: number;
  readonly glass: {
    readonly x: number;
    readonly bottom: number;
    readonly top: number;
    readonly inset: number;
  };
} = {
  name: "living-room door",
  width: ROOM_DOOR.width,
  height: 1.985,
  thickness: ROOM_DOOR.thickness,
  hinge: [LIVING_DOORWAY.x1 - 0.0125, floor + 0.01, LIVING_ROOM.z0 + 0.022],
  closedYaw: Math.PI,
  swing: 1,
  fitting: "rosettes",
  grips: [
    leverGrip(
      ROOM_DOOR.width - ROOM_DOOR.backset,
      ROOM_DOOR.lever,
      -ROOM_DOOR.thickness / 2,
    ),
    leverGrip(
      ROOM_DOOR.width - ROOM_DOOR.backset,
      ROOM_DOOR.lever,
      ROOM_DOOR.thickness / 2,
      "outer",
    ),
  ],
  open: 1.65,
  glass: { x: 0.14, bottom: 0.62, top: 0.2, inset: 0.012 },
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
].map(({ name, center, size }) => ({
  name,
  center: [...center],
  size: [...size],
}));

export const LIVING_FRAME = {
  lining: 0.022,
  head: 0.038,
  casing: 0.06,
  trim: 0.01,
};

const partFromBounds = (
  name: string,
  [ax, bx]: readonly [number, number],
  [ay, by]: readonly [number, number],
  [az, bz]: readonly [number, number],
): Part => ({
  name,
  center: [(ax + bx) / 2, floor + (ay + by) / 2, (az + bz) / 2],
  size: [bx - ax, by - ay, bz - az],
});

export const livingFrameParts = (): readonly Part[] => {
  const { x0, x1, height } = LIVING_DOORWAY;
  const { lining, head, casing, trim } = LIVING_FRAME;
  const latch = x0 + lining;
  const hinge = x1 - lining;
  const top = height - head;
  const reveal = [FLUR.z1, LIVING_ROOM.z0] as const;
  const casings = (face: string, z: readonly [number, number]) => [
    partFromBounds(
      `${face} latch casing`,
      [latch - casing, latch],
      [0, top],
      z,
    ),
    partFromBounds(
      `${face} hinge casing`,
      [hinge, hinge + casing],
      [0, top],
      z,
    ),
    partFromBounds(
      `${face} head casing`,
      [latch - casing, hinge + casing],
      [top, top + casing],
      z,
    ),
  ];
  return [
    partFromBounds("latch lining", [x0, latch], [0, height], reveal),
    partFromBounds("hinge lining", [hinge, x1], [0, height], reveal),
    partFromBounds("head lining", [latch, hinge], [top, height], reveal),
    ...casings("Flur", [FLUR.z1 - trim, FLUR.z1]),
    ...casings("living-room", [LIVING_ROOM.z0, LIVING_ROOM.z0 + trim]),
  ];
};
