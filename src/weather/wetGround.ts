import { clamp, lerp } from "../characters/scalar";
import { FACADE_Z, KERB_DEPTH, KERB_Z, ROAD_Y, acrossFootprint, acrossZ } from "../street/building";
import { STREET_LENGTH } from "../street/roadShape";
import type { Footprint } from "../street/footprint";
import { treePit } from "../street/layout";
import { MORE_TREES, TREE_POSITION } from "../street/trees";
import type { WeatherLook } from "./overcast";
import { DECAL } from "../toon/primitives";
import { PAVEMENT_DECAL_Y, ROAD_DECAL_Y } from "../street/decalPlane";

export const WATER_F0 = 0.02;

export const waterFresnel = (cosView: number) => WATER_F0 + (1 - WATER_F0) * (1 - clamp(cosView, 0, 1)) ** 5;

export const SHEEN = { film: { least: 0.05, most: 0.7 }, puddle: { least: 0.35, most: 1 } };

export const reflectance = (wet: number, puddle: number, cosView: number) => {
  const f = waterFresnel(cosView);
  const film = SHEEN.film.least + (SHEEN.film.most - SHEEN.film.least) * f;
  const pool = SHEEN.puddle.least + (SHEEN.puddle.most - SHEEN.puddle.least) * f;
  return wet * lerp(film, pool, clamp(puddle, 0, 1));
};

export const wetness = (look: WeatherLook) => look.wet;

const kerbEdge = (side: 1 | -1, z: number) => z + (side * KERB_DEPTH) / 2;

export const WET_SURFACES: readonly { readonly name: string; readonly y: number; readonly x: readonly [number, number]; readonly z: readonly [number, number] }[] = [
  { name: "No. 12's pavement", y: 0, x: [-STREET_LENGTH / 2, STREET_LENGTH / 2], z: [FACADE_Z, kerbEdge(-1, KERB_Z)] },
  { name: "the road", y: ROAD_Y, x: [-STREET_LENGTH / 2, STREET_LENGTH / 2], z: [kerbEdge(1, KERB_Z), kerbEdge(-1, acrossZ(KERB_Z))] },
  { name: "No. 13's pavement", y: 0, x: [-STREET_LENGTH / 2, STREET_LENGTH / 2], z: [kerbEdge(1, acrossZ(KERB_Z)), acrossZ(FACADE_Z)] },
];

export const MIRROR_HEIGHTS = [...new Set(WET_SURFACES.map((s) => s.y))];

export const DRY_PITS: readonly Footprint[] = [...[TREE_POSITION[0], ...MORE_TREES].map(treePit), ...MORE_TREES.map((x) => acrossFootprint(treePit(x)))];

export const WET_LAYERS = { shade: -2, puddles: -1, mirror: 0 } as const;

export const WET_FILM = { polygonOffsetFactor: DECAL.polygonOffsetFactor, polygonOffsetUnits: 2 * DECAL.polygonOffsetUnits, renderOrder: WET_LAYERS.mirror, resolution: 0.5, clearance: 0.002 } as const;

export const wetSheetY = (surface: { readonly y: number }) => (surface.y === ROAD_Y ? ROAD_DECAL_Y : PAVEMENT_DECAL_Y);
