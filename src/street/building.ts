import type { Vec3 } from "../toon/primitives";

export const FACADE_Z = -2.2;

export type Part = { readonly name: string; readonly center: Vec3; readonly size: Vec3 };

export const STOREYS = 6;
export const STOREY_HEIGHT = 2.85;
export const floorLevel = (storey: number) => (storey === 0 ? 0.15 : 3.3 + (storey - 1) * STOREY_HEIGHT);
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
};

const COLUMNS = [-8.8, -6.6, -4.4, 0.3, 3.0, 5.2, 7.4, 9.6];
const BALCONY_COLUMNS = [-6.6, 3.0, 7.4];
const shutterAt = (column: number, storey: number) => [0, 0, 0.35, 0, 0.6, 0, 0, 1][(column * 3 + storey * 5) % 8];

export const ENTRANCE_X = -1.9;

export type Flat = { readonly storey: number; readonly side: "links" | "rechts"; readonly name: string };
export const FLATS: readonly Flat[] = [
  ["Becker", "Yilmaz"],
  ["Tibik", "Schulz"],
  ["Nowak", "Weber"],
  ["Krause", "Hoffmann"],
  ["Kowalski", "Fischer"],
  ["Wagner", "Demir"],
].flatMap(([links, rechts], storey) => [
  { storey, side: "links" as const, name: links },
  { storey, side: "rechts" as const, name: rechts },
]);
export const residentOf = (storey: number, side: Flat["side"]) =>
  FLATS.find((f) => f.storey === storey && f.side === side)!.name;

export const OPENINGS: readonly Opening[] = [
  ...COLUMNS.map((x, column) => ({ x, y: 2.05, kind: "window" as const, shutter: shutterAt(column, 0) })),
  ...Array.from({ length: STOREYS - 1 }, (_, i) => i + 1).flatMap((storey) =>
    COLUMNS.map((x, column) =>
      BALCONY_COLUMNS.includes(x)
        ? { x, y: floorLevel(storey) + 1.15, kind: "balcony" as const, shutter: shutterAt(column, storey) }
        : { x, y: floorLevel(storey) + 1.6, kind: "window" as const, shutter: shutterAt(column, storey) },
    ),
  ),
  ...Array.from({ length: STOREYS - 1 }, (_, i) => ({
    x: ENTRANCE_X,
    y: floorLevel(i + 1) + 0.15,
    kind: "stairs" as const,
    shutter: 0,
  })),
];
export const WINDOWS = OPENINGS.filter((o) => o.kind === "window");

export const BALCONY = { slab: [2.6, 0.18, 1.3] as Vec3, railingHeight: 0.95 };
export const BALCONIES: readonly { readonly x: number; readonly y: number }[] = Array.from(
  { length: STOREYS - 1 },
  (_, i) => i + 1,
).flatMap((storey) => BALCONY_COLUMNS.map((x) => ({ x, y: floorLevel(storey) })));
