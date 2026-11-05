import type { Vec3 } from "../toon/primitives";
import type { Footprint } from "./footprint";

export const FACADE_Z = -2.2;
export const ACROSS_STREET = { facade: 14.5, shift: 3 };

export type Part = {
  readonly name: string;
  readonly center: Vec3;
  readonly size: Vec3;
};

export const STOREYS = 6;
export const STOREY_HEIGHT = 2.85;
export const floorLevel = (storey: number) =>
  storey === 0 ? 0.15 : 3.3 + (storey - 1) * STOREY_HEIGHT;
export const BUILDING_HEIGHT = floorLevel(STOREYS) + 0.6;

export const WINDOW = {
  frame: [1.15, 1.4, 0.08] as Vec3,
  sill: { offset: [0, -0.74, 0.1] as Vec3, size: [1.3, 0.05, 0.2] as Vec3 },
};
export const BALCONY_DOOR = { frame: [1.0, 2.2, 0.08] as Vec3 };
export const STAIR_WINDOW = { frame: [0.8, 1.1, 0.08] as Vec3 };

export type Opening = {
  readonly x: number;
  readonly y: number;
  readonly kind: "window" | "balcony" | "stairs";
  readonly shutter: number;
  readonly tilted: boolean;
};

const COLUMNS = [-8.8, -6.6, -4.4, 0.3, 3.0, 5.2, 7.4, 9.6];
const BALCONY_COLUMNS = [-6.6, 3.0, 7.4];
const SHUTTER_SEED: Readonly<Record<number, number>> = { 12: 0, 13: 3 };
const shutterAt = (column: number, storey: number, house: number) =>
  [0, 0, 0.35, 0, 0.6, 0, 0, 1][
    (column * 3 + storey * 5 + SHUTTER_SEED[house]) % 8
  ];
export const TILTED_BY_HOUSE: Readonly<
  Record<number, readonly (readonly [number, number])[]>
> = {
  12: [
    [3, 0],
    [2, 1],
    [5, 3],
    [7, 4],
  ],
  13: [
    [6, 0],
    [0, 2],
    [3, 3],
    [7, 5],
  ],
};
export const TILTED = TILTED_BY_HOUSE[12];
const tiltedAt = (column: number, storey: number, house: number) =>
  TILTED_BY_HOUSE[house].some(([c, s]) => c === column && s === storey);

export const ENTRANCE_X = -1.9;
export const DOORSTEP = { width: 1.8, depth: 0.5, height: 0.15 };
export const HAUSVERWALTUNG = "Hausverwaltung Musterstadt";

export type Flat = {
  readonly storey: number;
  readonly side: "links" | "rechts";
  readonly name: string;
};
const TENANTS: Readonly<
  Record<number, readonly (readonly [string, string])[]>
> = {
  12: [
    ["Becker", "Yilmaz"],
    ["Tibik", "Schulz"],
    ["Nowak", "Weber"],
    ["Krause", "Hoffmann"],
    ["Kowalski", "Fischer"],
    ["Wagner", "Demir"],
  ],
  13: [
    ["Richter", "Özdemir"],
    ["Klein", "Wolf"],
    ["Schröder", "Neumann"],
    ["Schwarz", "Zimmermann"],
    ["Braun", "Lehmann"],
    ["Hartmann", "Jankowski"],
  ],
};
export const HOUSES = Object.keys(TENANTS).map(Number);
export const flatsOf = (house: number): readonly Flat[] =>
  TENANTS[house].flatMap(([links, rechts], storey) => [
    { storey, side: "links" as const, name: links },
    { storey, side: "rechts" as const, name: rechts },
  ]);
export const residentsOf = (house: number) =>
  [...flatsOf(house)]
    .sort((a, b) => b.storey - a.storey || (a.side === "links" ? -1 : 1))
    .map((flat) => flat.name);
export const NO_ADS: Readonly<Record<number, string>> = {
  12: "Schulz",
  13: "Lehmann",
};
export const FLATS = flatsOf(12);
export const RESIDENTS = residentsOf(12);
export const residentOf = (storey: number, side: Flat["side"]) =>
  FLATS.find((f) => f.storey === storey && f.side === side)!.name;

export const openingsOf = (house: number): readonly Opening[] => [
  ...COLUMNS.map((x, column) => ({
    x,
    y: 2.05,
    kind: "window" as const,
    shutter: shutterAt(column, 0, house),
    tilted: tiltedAt(column, 0, house),
  })),
  ...Array.from({ length: STOREYS - 1 }, (_, i) => i + 1).flatMap((storey) =>
    COLUMNS.map((x, column) =>
      BALCONY_COLUMNS.includes(x)
        ? {
            x,
            y: floorLevel(storey) + 1.15,
            kind: "balcony" as const,
            shutter: shutterAt(column, storey, house),
            tilted: false,
          }
        : {
            x,
            y: floorLevel(storey) + 1.6,
            kind: "window" as const,
            shutter: shutterAt(column, storey, house),
            tilted: tiltedAt(column, storey, house),
          },
    ),
  ),
  ...Array.from({ length: STOREYS - 1 }, (_, i) => ({
    x: ENTRANCE_X,
    y: floorLevel(i + 1) + 0.15,
    kind: "stairs" as const,
    shutter: 0,
    tilted: false,
  })),
];
export const OPENINGS = openingsOf(12);
export const KERB_Z = 1.92;
export const KERB_DEPTH = 0.24;
export const KERB_HEIGHT = 0.16;
export const KERB_Y = -0.06;
export const ROAD_Y = -0.12;
export const acrossZ = (z: number) => ACROSS_STREET.facade + FACADE_Z - z;
export const acrossFootprint = (fp: Footprint): Footprint => ({
  x: [ACROSS_STREET.shift - fp.x[1], ACROSS_STREET.shift - fp.x[0]],
  z: [acrossZ(fp.z[1]), acrossZ(fp.z[0])],
});
export const BLOCK_SPAN = 30;
export const houseNumber = (base: number, block: number, numbering: 1 | -1) =>
  base + 2 * block * numbering;

export const openingFrame = (o: Opening) =>
  o.kind === "window"
    ? WINDOW.frame
    : o.kind === "balcony"
      ? BALCONY_DOOR.frame
      : STAIR_WINDOW.frame;

export const WINDOWS = OPENINGS.filter((o) => o.kind === "window");

export const BALCONY = { slab: [2.6, 0.18, 1.3] as Vec3, bar: 0.04 };

export const railingHeightFor = (drop: number) => (drop > 12 ? 1.1 : 0.9);

export type BalconyPart = {
  readonly name: "slab" | "front" | "side";
  readonly center: Vec3;
  readonly size: Vec3;
};

export const balconyParts = (drop: number): BalconyPart[] => {
  const [w, t, d] = BALCONY.slab;
  const h = railingHeightFor(drop);
  const bar = BALCONY.bar;
  return [
    { name: "slab", center: [0, -t / 2, d / 2], size: BALCONY.slab },
    { name: "front", center: [0, h / 2, d - bar / 2], size: [w, h, bar] },
    ...([1, -1] as const).map(
      (side): BalconyPart => ({
        name: "side",
        center: [side * (w / 2 - bar / 2), h / 2, (d - bar) / 2],
        size: [bar, h, d - bar],
      }),
    ),
  ];
};
const BALCONY_DECOR: Readonly<
  Record<number, { readonly boxOffset: number; readonly dish: number }>
> = {
  12: { boxOffset: 0, dish: 4 },
  13: { boxOffset: 1, dish: -1 },
};
export const balconyDecor = (house: number, index: number) => ({
  box: (index + BALCONY_DECOR[house].boxOffset) % 3 === 0,
  dish: index === BALCONY_DECOR[house].dish,
});
export const BALCONIES: readonly { readonly x: number; readonly y: number }[] =
  Array.from({ length: STOREYS - 1 }, (_, i) => i + 1).flatMap((storey) =>
    BALCONY_COLUMNS.map((x) => ({ x, y: floorLevel(storey) })),
  );
