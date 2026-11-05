import { Euler, Matrix4, Vector3 } from "three";
import type { Footprint } from "./footprint";
import { stairwellGround } from "../building/stairwell";
import { FOUND_KARTON_SIZE, kartonBounds } from "./kartonShape";
import {
  frame,
  halfSpace,
  obb,
  type Obb,
  type Solid,
  partObb,
} from "../physics/collision";
import type { Vec3 } from "../toon/primitives";
import { tonneColliders, type TonneKind } from "./tonneShape";
import {
  BALCONIES,
  BALCONY,
  DOORSTEP,
  ENTRANCE_X,
  FACADE_Z,
  KERB_Z,
  KERB_DEPTH,
  KERB_HEIGHT,
  KERB_Y,
  OPENINGS,
  RESIDENTS,
  WINDOW,
  WINDOWS,
  openingFrame,
  type Part,
} from "./building";
import {
  ENTRANCE_PARTS,
  aroundOpenings,
  facadePieces,
  haustuerSolids,
} from "./facade";
import { PARKED_CARS, carParts } from "./carShape";
import { STREET_LAMPS, lampParts } from "./lamps";
import { bikeParts } from "./bikes";
import { TREE_POSITION, TRUNK } from "./trees";
import { poleBox } from "./wraps";
export { MORE_TREES, STREET_TREE_XS, TREE_POSITION } from "./trees";

export * from "./building";
export * from "./carShape";

export const GROUND = halfSpace("ground", new Vector3(0, 1, 0), 0);
export const TREE_PIT = { along: 2.0, across: 1.3 };
export const treePit = (x: number): Footprint => {
  const kerb = KERB_Z - KERB_DEPTH / 2;
  return {
    x: [x - TREE_PIT.along / 2, x + TREE_PIT.along / 2],
    z: [kerb - TREE_PIT.across, kerb],
  };
};

const at = (x: number, y: number, dz: number): Vec3 => [x, y, FACADE_Z + dz];
const onFacade = (name: string, x: number, y: number, size: Vec3): Part => ({
  name,
  center: at(x, y, size[2] / 2),
  size,
});

export const ENTRANCE_STEP: Part = {
  name: "door step",
  center: at(ENTRANCE_X, DOORSTEP.height / 2, DOORSTEP.depth / 2),
  size: [DOORSTEP.width, DOORSTEP.height, DOORSTEP.depth],
};
export const ENTRANCE_MAT = {
  size: [0.6, 0.4] as const,
  frame: 0.015,
  lift: 0.001,
};
export const entranceMatRect = () => {
  const [w, d] = ENTRANCE_MAT.size;
  const [x, y, z] = ENTRANCE_STEP.center;
  return {
    x0: x - w / 2,
    x1: x + w / 2,
    z0: z - d / 2,
    z1: z + d / 2,
    y: y + ENTRANCE_STEP.size[1] / 2 + ENTRANCE_MAT.lift,
  };
};
export const entranceGround = (x: number, z: number) => {
  const r = entranceMatRect();
  const floor = stairwellGround(x, z);
  return x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1
    ? Math.max(floor, r.y)
    : floor;
};
export const DOORBELL_PANEL: Part = {
  name: "doorbell panel",
  center: at(ENTRANCE_X + 0.95, 1.4, 0.02),
  size: [0.2, 0.5, 0.03],
};
export const MAILBOXES = onFacade(
  "mailboxes",
  ENTRANCE_X - 1.05,
  1.15,
  [0.72, 0.62, 0.14],
);
export const HYDRANT_SIGN: Part = {
  name: "hydrant sign",
  center: at(-3.53, 1.6, 0.003),
  size: [0.25, 0.2, 0.002],
};
export const HYDRANT = {
  bore: 80,
  side: 1.4,
  toward: 1 as 1 | -1,
  ahead: 3.2,
  cap: [0.4, 0.3] as const,
};
export const hydrantCap = () => ({
  x: HYDRANT_SIGN.center[0] + HYDRANT.toward * HYDRANT.side,
  z: FACADE_Z + HYDRANT.ahead,
});
export const metres = (m: number) => m.toFixed(1).replace(".", ",");
export const DOORBELL_FACE = {
  px: [192, 512] as const,
  speaker: { top: 16, height: 84 },
  rows: { top: 112, bottom: 496 },
};
export const doorbellRow = (i: number) => {
  const { rows } = DOORBELL_FACE;
  const height = (rows.bottom - rows.top) / RESIDENTS.length;
  return { y: rows.top + (i + 0.5) * height, height };
};
export const MAILBOX_GRID = {
  cols: 3,
  rows: 4,
  px: [512, 440] as const,
  inset: 0.02,
  lift: 0.005,
  slot: { x: 20, y: 22, height: 10 },
};
export const mailboxPlate = () => {
  const [w, h, d] = MAILBOXES.size;
  const face = MAILBOXES.center[2] + d / 2;
  return {
    face,
    plate: face + MAILBOX_GRID.lift,
    width: w - MAILBOX_GRID.inset,
    height: h - MAILBOX_GRID.inset,
  };
};
export const mailboxCell = (i: number) => {
  const { cols, rows, px } = MAILBOX_GRID;
  const [w, h] = [px[0] / cols, px[1] / rows];
  return { x: (i % cols) * w, y: Math.floor(i / cols) * h, w, h };
};
export const platePoint = (u: number, v: number): Vec3 => {
  const { px } = MAILBOX_GRID;
  const { plate, width, height } = mailboxPlate();
  return [
    MAILBOXES.center[0] + (u / px[0] - 0.5) * width,
    MAILBOXES.center[1] + (0.5 - v / px[1]) * height,
    plate,
  ];
};
export const mailboxCellOf = (name: string) => {
  const i = RESIDENTS.indexOf(name);
  if (i < 0) throw new Error(`No mailbox for ${name}`);
  return mailboxCell(i);
};
export const mailboxSlot = (name: string): Vec3 => {
  const { slot } = MAILBOX_GRID;
  const cell = mailboxCellOf(name);
  return platePoint(cell.x + cell.w / 2, cell.y + slot.y + slot.height / 2);
};
export const FLYER = {
  house: 12,
  resident: "Krause",
  size: [0.1, 0.05, 0.003] as Vec3,
  tilt: 0.5,
  inside: 0.002,
  ink: 0.002,
};
export const flyerBox = () => {
  const [x, y, z] = mailboxSlot(FLYER.resident);
  const top: Vec3 = [x, y, z - FLYER.inside];
  const length = FLYER.size[1];
  const bottom: Vec3 = [
    x,
    y - length * Math.cos(FLYER.tilt),
    top[2] + length * Math.sin(FLYER.tilt),
  ];
  return { top, bottom };
};
export const flyerPose = () => {
  const { top, bottom } = flyerBox();
  return {
    position: [
      (top[0] + bottom[0]) / 2,
      (top[1] + bottom[1]) / 2,
      (top[2] + bottom[2]) / 2,
    ] as Vec3,
    rotation: [-FLYER.tilt, 0, 0] as Vec3,
    size: [...FLYER.size] as Vec3,
  };
};
export const ENTRANCE_LAMP = onFacade(
  "entrance lamp",
  MAILBOXES.center[0],
  2.2,
  [0.12, 0.24, 0.1],
);

export const PLINTH = aroundOpenings({
  name: "plinth",
  center: at(0, 0.275, 0.025),
  size: [30, 0.55, 0.05],
});
export const FLOOR_BAND = aroundOpenings({
  name: "floor band",
  center: at(0, 3.45, 0.04),
  size: [30, 0.12, 0.08],
});

export const STREET_PARTS: readonly Part[] = [
  ...PLINTH,
  ...FLOOR_BAND,
  ...OPENINGS.map((o) => ({
    name: `${o.kind} frame`,
    center: at(o.x, o.y, openingFrame(o)[2] / 2),
    size: openingFrame(o),
  })),
  ...WINDOWS.map(({ x, y }) => ({
    name: "window sill",
    center: at(
      x + WINDOW.sill.offset[0],
      y + WINDOW.sill.offset[1],
      WINDOW.sill.offset[2],
    ),
    size: WINDOW.sill.size,
  })),
  ...BALCONIES.map(({ x, y }) => ({
    name: "balcony",
    center: at(x, y - BALCONY.slab[1] / 2, BALCONY.slab[2] / 2),
    size: BALCONY.slab,
  })),
  ENTRANCE_STEP,
  ...ENTRANCE_PARTS,
  DOORBELL_PANEL,
  MAILBOXES,
  ENTRANCE_LAMP,
  {
    name: "curb",
    center: [0, KERB_Y, KERB_Z],
    size: [30, KERB_HEIGHT, KERB_DEPTH],
  },
  {
    name: "tree trunk",
    center: [TREE_POSITION[0], TRUNK.height / 2, TREE_POSITION[2]],
    size: poleBox(TRUNK),
  },
  ...PARKED_CARS.flatMap(carParts),
  ...STREET_LAMPS.flatMap(lampParts),
  ...bikeParts(),
];


export const STREET_SOLIDS: readonly Solid[] = [
  GROUND,
  ...facadePieces().map(partObb),
  ...STREET_PARTS.map(partObb),
];

export type BinItem = {
  readonly name: string;
  readonly position: Vec3;
  readonly rotation: Vec3;
  readonly size: Vec3;
  readonly material: "cardboard" | "paper" | "karton";
};

export type BinSpec = {
  readonly name: string;
  readonly position: Vec3;
  readonly kind: TonneKind;
  readonly lid: number;
  readonly contents: readonly BinItem[];
};

export const BIN_Z = -1.76;
export const SEARCHED_BIN = "Papier 2";
export const FOUND_SHEET = "sheet lying on top";

const FOUND_ROTATION = (() => {
  const standing = new Matrix4()
    .makeRotationY(Math.PI)
    .multiply(new Matrix4().makeRotationX(0.1));
  const e = new Euler().setFromRotationMatrix(standing, "XYZ");
  return [e.x, e.y, e.z] as Vec3;
})();

const SEARCHED_BIN_CONTENTS: readonly BinItem[] = [
  {
    name: "paper layer",
    position: [0, 0.5, 0],
    rotation: [0, 0, 0],
    size: [0.44, 0.45, 0.55],
    material: "paper",
  },
  {
    name: "sheet against the back",
    position: [0, 0.8, -0.29],
    rotation: [-0.08, 0, 0],
    size: [0.44, 0.3, 0.024],
    material: "cardboard",
  },
  {
    name: FOUND_SHEET,
    position: [0, 0.93, 0.27],
    rotation: FOUND_ROTATION,
    size: kartonBounds(FOUND_KARTON_SIZE, 0).size,
    material: "karton",
  },
];

export const BINS: readonly BinSpec[] = [
  {
    name: "Restmüll",
    position: [0, 0, BIN_Z],
    kind: "rest",
    lid: 0,
    contents: [],
  },
  {
    name: "Papier 1",
    position: [0.7, 0, BIN_Z],
    kind: "papier",
    lid: 0.22,
    contents: [
      {
        name: "sheet sticking out",
        position: [0, 0.985, 0.175],
        rotation: [-0.22, 0, 0],
        size: [0.45, 0.024, 0.77],
        material: "cardboard",
      },
    ],
  },
  {
    name: SEARCHED_BIN,
    position: [1.4, 0, BIN_Z],
    kind: "papier",
    lid: 0.25,
    contents: SEARCHED_BIN_CONTENTS,
  },
  {
    name: "Papier 3",
    position: [2.1, 0, BIN_Z],
    kind: "papier",
    lid: 0,
    contents: [],
  },
  {
    name: "Wertstoffe",
    position: [2.8, 0, BIN_Z],
    kind: "gelb",
    lid: 0,
    contents: [],
  },
];

export const binByName = (name: string) => BINS.find((b) => b.name === name)!;

export const worldSolids = (
  lids: readonly number[],
  haustuer = 0,
  haustuerLever = 0,
): Solid[] => [
  ...STREET_SOLIDS,
  ...haustuerSolids(haustuer, haustuerLever),
  ...BINS.flatMap((bin, i) => tonneColliders(bin.name, bin.position, lids[i])),
];

export const binContentSolids = (except?: string): Obb[] =>
  BINS.flatMap((bin) =>
    binItemColliders(bin).filter((_, i) => {
      const item = bin.contents[i];
      return item.material !== "paper" && item.name !== except;
    }),
  );

export const binItemColliders = (bin: BinSpec): Obb[] =>
  bin.contents.map((item) =>
    obb(
      `${bin.name} ${item.name}`,
      frame(
        frame(new Matrix4(), bin.position),
        item.position,
        new Euler(...item.rotation),
      ),
      item.size,
    ),
  );
