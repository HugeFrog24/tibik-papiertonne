import { random } from "remotion";
import { CORE } from "../building/stairwell";
import { BLOCK_SPAN, BUILDING_HEIGHT, CORNICE, FACADE_Z, acrossZ, type Part } from "./building";
import { FACADE_THICKNESS } from "./facade";
import type { Footprint } from "./footprint";
import { switchedOn } from "./lightsOn";
import { STREET_END, STREET_MIDDLE } from "./roadShape";

export const BLOCK_DEPTH = 12;
export const PARAPET = { height: 0.45, thickness: 0.25 };
const SLAB = 0.3;
const SMOKE_VENT = { size: 1.1, height: 0.45, dome: 0.45 };
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
  const parapetFront = CORNICE.center[2] - CORNICE.size[2] / 2;
  const sideDepth = parapetFront - back - 2 * t;
  const sideZ = (parapetFront + back) / 2;
  const vent = { x: (CORE.x0 + CORE.x1) / 2, z: (CORE.z0 + CORE.z1) / 2 };
  const dome = SMOKE_VENT.size * SMOKE_VENT.dome;
  return [
    { name: "roof slab", center: [0, BUILDING_HEIGHT - SLAB / 2, (front + back) / 2], size: [BLOCK_SPAN, SLAB, front - back] },
    { name: "parapet", center: [0, y, parapetFront - t / 2], size: [BLOCK_SPAN, PARAPET.height, t] },
    { name: "parapet", center: [0, y, back + t / 2], size: [BLOCK_SPAN, PARAPET.height, t] },
    { name: "parapet", center: [-half + t / 2, y, sideZ], size: [t, PARAPET.height, sideDepth] },
    { name: "parapet", center: [half - t / 2, y, sideZ], size: [t, PARAPET.height, sideDepth] },
    {
      name: "smoke vent",
      center: [vent.x, BUILDING_HEIGHT + SMOKE_VENT.height / 2, vent.z],
      size: [SMOKE_VENT.size, SMOKE_VENT.height, SMOKE_VENT.size],
    },
    {
      name: "smoke vent dome",
      center: [vent.x, BUILDING_HEIGHT + SMOKE_VENT.height + dome / 2, vent.z],
      size: [2 * dome, dome, 2 * dome],
    },
    ...VENT_PIPES.map(([x, z]): Part => ({ name: "vent pipe", center: [x, BUILDING_HEIGHT + 0.3, z], size: [0.12, 0.6, 0.12] })),
  ];
};

export type TownBlock = { readonly x: number; readonly z: number; readonly w: number; readonly d: number; readonly h: number };

const ROW = { from: -135, step: 30, count: 10 };
const BEHIND_NO_12 = [-30, -52] as const;
const BEHIND_NO_13 = BEHIND_NO_12.map(acrossZ);

const townRow = (z: number, seed: string): TownBlock[] =>
  Array.from({ length: ROW.count }, (_, i) => {
    const r = (key: string) => random(`town/${seed}/${i}/${key}`);
    return {
      x: ROW.from + i * ROW.step + (r("x") - 0.5) * 3,
      z: z + (r("z") - 0.5) * 3,
      w: 18 + r("w") * 6,
      d: 10 + r("d") * 4,
      h: 15 + r("h") * 10,
    };
  });

export const TOWN_WINDOW = { w: 1.2, h: 1.4, every: [2.6, 2.85] as const };

export const townWindows = (block: TownBlock) => {
  const columns = Math.floor(block.w / TOWN_WINDOW.every[0]);
  const rows = Math.floor((block.h - 1) / TOWN_WINDOW.every[1]);
  return Array.from({ length: columns * rows }, (_, k) => ({
    x: ((k % columns) + 0.5) * (block.w / columns),
    y: 1 + (Math.floor(k / columns) + 0.5) * ((block.h - 1) / rows),
    k,
  }));
};

export const townWindowsOn = (block: TownBlock, index: number, share: number) =>
  townWindows(block)
    .filter((win) => switchedOn(`town-light/${index}/${win.k}`, share))
    .map((win) => win.k);

export const TOWN: readonly TownBlock[] = [
  ...BEHIND_NO_12.flatMap((z, i) => townRow(z, `north-${i}`)),
  ...BEHIND_NO_13.flatMap((z, i) => townRow(z, `south-${i}`)),
];

export const townFootprint = (b: TownBlock): Footprint => ({
  x: [b.x - b.w / 2, b.x + b.w / 2],
  z: [b.z - b.d / 2, b.z + b.d / 2],
});

export const endBlockFootprint = (end: 1 | -1): Footprint => {
  const near = end * STREET_END;
  const far = end * (STREET_END + BLOCK_DEPTH);
  return {
    x: [Math.min(near, far), Math.max(near, far)],
    z: [STREET_MIDDLE - BLOCK_SPAN / 2, STREET_MIDDLE + BLOCK_SPAN / 2],
  };
};

const GROUND_MARGIN = 20;

export const TOWN_GROUND = {
  y: -0.25,
  x: [ROW.from - BLOCK_SPAN / 2 - GROUND_MARGIN, ROW.from + (ROW.count - 1) * ROW.step + BLOCK_SPAN / 2 + GROUND_MARGIN] as const,
  z: [Math.min(...BEHIND_NO_12) - GROUND_MARGIN, Math.max(...BEHIND_NO_13) + GROUND_MARGIN] as const,
};
