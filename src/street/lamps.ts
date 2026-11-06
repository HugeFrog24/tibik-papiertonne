import type { Vec3 } from "../toon/primitives";
import { KERB_Z, acrossZ, type Part } from "./building";
import { poleBox, taperedPole, type Wrap } from "./wraps";

export const LAMP = {
  height: 5.0,
  radius: [0.05, 0.075] as const,
  arm: 0.7,
  head: [0.55, 0.09, 0.26] as Vec3,
  kerbSetback: 0.45,
  lightBelowTop: 0.12,
};

export const LAMP_LIGHT = "#ffb46b";
export const LAMP_POOL = { reach: 9, angle: 1.0, penumbra: 0.7 };
const GLOW = { lens: 1.5, light: 0.7 };
export const lampGlow = (on: boolean) => ({
  lens: { color: LAMP_LIGHT, light: on ? GLOW.lens : 0 },
  light: on ? GLOW.light : 0,
});

export type StreetLamp = {
  readonly x: number;
  readonly z: number;
  readonly toward: 1 | -1;
};

export const lampLightAt = (lamp: StreetLamp): Vec3 => [lamp.x, LAMP.height - LAMP.lightBelowTop, lamp.z + lamp.toward * LAMP.arm];

export const STREET_LAMPS: readonly StreetLamp[] = [
  ...[-76, -46, -16, 14, 44, 74].map(
    (x): StreetLamp => ({ x, z: KERB_Z - LAMP.kerbSetback, toward: 1 }),
  ),
  ...[-91, -61, -31, -1, 29, 59, 89].map(
    (x): StreetLamp => ({
      x,
      z: acrossZ(KERB_Z - LAMP.kerbSetback),
      toward: -1,
    }),
  ),
];

export const lampParts = (lamp: StreetLamp): Part[] => [
  {
    name: "street lamp",
    center: [lamp.x, LAMP.height / 2, lamp.z],
    size: poleBox(POLE),
  },
];

export const POLE_SEGMENTS = 12;
export const POLE_FACE = (2 * Math.PI) / POLE_SEGMENTS;

export type StickerDesign = "band" | "dot" | "stripe" | "club" | "note";

export const POLE = taperedPole(LAMP.radius, LAMP.height, POLE_SEGMENTS);

export type LampWrap = Wrap<StickerDesign | "plate">;
export type Sticker = Wrap<StickerDesign>;

export const MAST_PLATE: LampWrap = {
  face: 8,
  faces: 2,
  bottom: 2.15,
  height: 0.1,
  design: "plate",
};

export const STICKERS: readonly Sticker[] = [
  { face: 7, faces: 2, bottom: 1.55, height: 0.105, design: "band" },
  { face: 9, faces: 2, bottom: 1.42, height: 0.07, design: "dot" },
  { face: 8, faces: 1, bottom: 1.2, height: 0.12, design: "stripe" },
  { face: 10, faces: 2, bottom: 1.7, height: 0.05, design: "club" },
  { face: 2, faces: 2, bottom: 1.5, height: 0.1, design: "note" },
  { face: 5, faces: 3, bottom: 1.0, height: 0.07, design: "band" },
  { face: 11, faces: 1, bottom: 1.1, height: 0.09, design: "note" },
];

const lampIndex = (lamp: StreetLamp) => {
  const index = STREET_LAMPS.indexOf(lamp);
  if (index < 0) throw new Error(`unknown street lamp at ${lamp.x}`);
  return index;
};

export const stickersOn = (lamp: StreetLamp): Sticker[] => {
  const index = lampIndex(lamp);
  return STICKERS.filter((_, j) => (j + index) % 4 !== 0);
};

export const mastNumber = (lamp: StreetLamp) => String(201 + lampIndex(lamp));
