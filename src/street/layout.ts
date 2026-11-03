import { Euler, Matrix4, Vector3 } from "three";
import { FOUND_KARTON_SIZE, kartonBounds } from "./kartonShape";
import { frame, halfSpace, obb, type Obb, type Solid } from "../physics/collision";
import type { Vec3 } from "../toon/primitives";
import { tonneColliders, type TonneKind } from "./tonneShape";
import {
  BALCONIES,
  BALCONY,
  BALCONY_DOOR,
  ENTRANCE_X,
  FACADE_Z,
  OPENINGS,
  STAIR_WINDOW,
  WINDOW,
  WINDOWS,
  type Opening,
  type Part,
} from "./building";
import { ENTRANCE_PARTS, aroundOpenings, facadePieces, haustuerSolids } from "./facade";

export * from "./building";

export const GROUND = halfSpace("ground", new Vector3(0, 1, 0), 0);
export const TREE_POSITION: Vec3 = [-4.2, 0, 1.15];

export type ParkedCar = { readonly x: number; readonly color: string; readonly plate: string };
export const CAR = { size: [4.2, 1.45, 1.75] as Vec3, z: 3.07 };
export const PARKED_CARS: readonly ParkedCar[] = [
  { x: -9.6, color: "#b8bcc2", plate: "MU-TB 112" },
  { x: -4.9, color: "#2c3e66", plate: "MU-KS 2048" },
  { x: 6.3, color: "#eeeeea", plate: "MU-RW 77" },
  { x: 10.9, color: "#4a4f57", plate: "MU-AH 1203" },
];

export const MAILBOXES = { center: [ENTRANCE_X - 1.05, 1.15] as const, size: [0.72, 0.62, 0.14] as Vec3 };

const at = (x: number, y: number, dz: number): Vec3 => [x, y, FACADE_Z + dz];

const openingFrame = (o: Opening) =>
  o.kind === "window" ? WINDOW.frame : o.kind === "balcony" ? BALCONY_DOOR.frame : STAIR_WINDOW.frame;

export const PLINTH = aroundOpenings({ name: "plinth", center: at(0, 0.275, 0.025), size: [30, 0.55, 0.05] });
export const FLOOR_BAND = aroundOpenings({ name: "floor band", center: at(0, 3.45, 0.04), size: [30, 0.12, 0.08] });

export const STREET_PARTS: readonly Part[] = [
  ...PLINTH,
  ...FLOOR_BAND,
  ...OPENINGS.map((o) => ({ name: `${o.kind} frame`, center: at(o.x, o.y, openingFrame(o)[2] / 2), size: openingFrame(o) })),
  ...WINDOWS.map(({ x, y }) => ({
    name: "window sill",
    center: at(x + WINDOW.sill.offset[0], y + WINDOW.sill.offset[1], WINDOW.sill.offset[2]),
    size: WINDOW.sill.size,
  })),
  ...BALCONIES.map(({ x, y }) => ({ name: "balcony", center: at(x, y - BALCONY.slab[1] / 2, BALCONY.slab[2] / 2), size: BALCONY.slab })),
  { name: "door step", center: at(ENTRANCE_X, 0.075, 0.25), size: [1.8, 0.15, 0.5] },
  ...ENTRANCE_PARTS,
  { name: "doorbell panel", center: at(ENTRANCE_X + 0.95, 1.4, 0.02), size: [0.2, 0.5, 0.03] },
  { name: "mailboxes", center: at(MAILBOXES.center[0], MAILBOXES.center[1], MAILBOXES.size[2] / 2), size: MAILBOXES.size },
  { name: "curb", center: [0, -0.06, 1.92], size: [30, 0.16, 0.24] },
  { name: "tree trunk", center: [TREE_POSITION[0], 1.6, TREE_POSITION[2]], size: [0.26, 3.2, 0.26] },
  ...PARKED_CARS.map((car) => ({ name: "parked car", center: [car.x, CAR.size[1] / 2, CAR.z] as Vec3, size: CAR.size })),
];

const partSolid = (p: Part): Obb => obb(p.name, frame(new Matrix4(), p.center), p.size);

export const STREET_SOLIDS: readonly Solid[] = [GROUND, ...facadePieces().map(partSolid), ...STREET_PARTS.map(partSolid)];

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
  const standing = new Matrix4().makeRotationY(Math.PI).multiply(new Matrix4().makeRotationX(0.1));
  const e = new Euler().setFromRotationMatrix(standing, "XYZ");
  return [e.x, e.y, e.z] as Vec3;
})();

const SEARCHED_BIN_CONTENTS: readonly BinItem[] = [
  { name: "paper layer", position: [0, 0.5, 0], rotation: [0, 0, 0], size: [0.44, 0.45, 0.55], material: "paper" },
  { name: "sheet against the back", position: [0, 0.8, -0.29], rotation: [-0.08, 0, 0], size: [0.44, 0.3, 0.024], material: "cardboard" },
  {
    name: FOUND_SHEET,
    position: [0, 0.93, 0.27],
    rotation: FOUND_ROTATION,
    size: kartonBounds(FOUND_KARTON_SIZE, 0).size,
    material: "karton",
  },
];

export const BINS: readonly BinSpec[] = [
  { name: "Restmüll", position: [0, 0, BIN_Z], kind: "rest", lid: 0, contents: [] },
  {
    name: "Papier 1",
    position: [0.7, 0, BIN_Z],
    kind: "papier",
    lid: 0.22,
    contents: [
      { name: "sheet sticking out", position: [0, 0.985, 0.175], rotation: [-0.22, 0, 0], size: [0.45, 0.024, 0.77], material: "cardboard" },
    ],
  },
  { name: SEARCHED_BIN, position: [1.4, 0, BIN_Z], kind: "papier", lid: 0.25, contents: SEARCHED_BIN_CONTENTS },
  { name: "Papier 3", position: [2.1, 0, BIN_Z], kind: "papier", lid: 0, contents: [] },
  { name: "Wertstoffe", position: [2.8, 0, BIN_Z], kind: "gelb", lid: 0, contents: [] },
];

export const binByName = (name: string) => BINS.find((b) => b.name === name)!;

export const worldSolids = (lids: readonly number[], haustuer = 0): Solid[] => [
  ...STREET_SOLIDS,
  ...haustuerSolids(haustuer),
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
      frame(frame(new Matrix4(), bin.position), item.position, new Euler(...item.rotation)),
      item.size,
    ),
  );
