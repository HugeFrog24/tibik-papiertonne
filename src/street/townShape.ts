import { random } from "remotion";
import { CORE } from "../building/stairwell";
import { BLOCK_SPAN, BUILDING_HEIGHT, FACADE_Z, type Part } from "./building";
import { FACADE_THICKNESS } from "./facade";

export const BLOCK_DEPTH = 12;
export const PARAPET = { height: 0.35, thickness: 0.25 };
const CORNICE_BACK = 0.4;
const SLAB = 0.3;
const SMOKE_VENT = { size: 1.1, height: 0.45 };
const VENT_PIPES: readonly (readonly [number, number])[] = [
  [-8.2, -8.0],
  [6.4, -9.1],
];

export const roofParts = (): readonly Part[] => {
  const back = FACADE_Z - BLOCK_DEPTH;
  const front = FACADE_Z - FACADE_THICKNESS;
  const half = BLOCK_SPAN / 2;
  const t = PARAPET.thickness;
  const y = BUILDING_HEIGHT + PARAPET.height / 2;
  const parapetFront = FACADE_Z - CORNICE_BACK;
  const sideDepth = parapetFront - back - 2 * t;
  const sideZ = (parapetFront + back) / 2;
  return [
    { name: "roof slab", center: [0, BUILDING_HEIGHT - SLAB / 2, (front + back) / 2], size: [BLOCK_SPAN, SLAB, front - back] },
    { name: "parapet", center: [0, y, parapetFront - t / 2], size: [BLOCK_SPAN, PARAPET.height, t] },
    { name: "parapet", center: [0, y, back + t / 2], size: [BLOCK_SPAN, PARAPET.height, t] },
    { name: "parapet", center: [-half + t / 2, y, sideZ], size: [t, PARAPET.height, sideDepth] },
    { name: "parapet", center: [half - t / 2, y, sideZ], size: [t, PARAPET.height, sideDepth] },
    {
      name: "smoke vent",
      center: [(CORE.x0 + CORE.x1) / 2, BUILDING_HEIGHT + SMOKE_VENT.height / 2, (CORE.z0 + CORE.z1) / 2],
      size: [SMOKE_VENT.size, SMOKE_VENT.height, SMOKE_VENT.size],
    },
    ...VENT_PIPES.map(([x, z]): Part => ({ name: "vent pipe", center: [x, BUILDING_HEIGHT + 0.3, z], size: [0.12, 0.6, 0.12] })),
  ];
};

export type TownBlock = { readonly x: number; readonly z: number; readonly w: number; readonly d: number; readonly h: number };

const ROW = { from: -105, step: 30, count: 8 };
const BEHIND_NO_12 = [-26, -48] as const;
const BEHIND_NO_13 = [40, 62] as const;

const townRow = (z: number, seed: string): TownBlock[] =>
  Array.from({ length: ROW.count }, (_, i) => {
    const r = (key: string) => random(`town/${seed}/${i}/${key}`);
    return {
      x: ROW.from + i * ROW.step + (r("x") - 0.5) * 4,
      z: z + (r("z") - 0.5) * 3,
      w: 20 + r("w") * 6,
      d: 10 + r("d") * 4,
      h: 15 + r("h") * 10,
    };
  });

export const TOWN: readonly TownBlock[] = [
  ...BEHIND_NO_12.flatMap((z, i) => townRow(z, `north-${i}`)),
  ...BEHIND_NO_13.flatMap((z, i) => townRow(z, `south-${i}`)),
];
