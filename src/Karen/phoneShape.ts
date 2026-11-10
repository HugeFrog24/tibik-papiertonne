import type { PropPlace } from "../characters/propPlace";
import { aroundCorner } from "../physics/gripPath";
import { OUTLINE, type Vec3 } from "../toon/primitives";
import { KAREN_SKELETON } from "./rig";

export const PHONE = { size: [0.055, 0.12, 0.016] as Vec3, ink: 0.004 };

export type PhonePlace = PropPlace;

export const PHONE_AT_POCKET: PhonePlace = {
  position: [-0.52, 0.12, 0.28],
  rotation: [0, Math.PI, Math.PI],
};

export const PHONE_AT_MOUTH: PhonePlace = {
  position: [-0.24, 0.86, 0.28],
  rotation: [0.4, Math.PI, 0],
};

export const PHONE_AT_HIP: PhonePlace = {
  position: [-0.22, 0.36, 0.42],
  rotation: [0.3, Math.PI, Math.PI],
};

export const PHONE_AT_LOOK: PhonePlace = {
  position: [-0.3, 0.6, 0.42],
  rotation: [0.84, 2.58, 0],
};

export const FACE = { width: 110, height: 240, cover: [0.86, 0.9] as const };
export const SCREEN = { left: 10, top: 10, width: 90, height: 48 };
export const DIGITS = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "*",
  "0",
  "#",
] as const;
export type Key = "call" | "end" | (typeof DIGITS)[number];
export const KEY = { width: 24, height: 28 };

export const keyPixel = (key: Key): [number, number] => {
  if (key === "call") return [32, 74];
  if (key === "end") return [78, 74];
  const i = DIGITS.indexOf(key);
  if (i < 0) throw new Error(`no key ${key}`);
  return [
    14 + (i % 3) * 30 + KEY.width / 2,
    92 + Math.floor(i / 3) * 36 + KEY.height / 2,
  ];
};

export const faceLocal = ([px, py]: readonly [number, number]): Vec3 => [
  (px / FACE.width - 0.5) * PHONE.size[0] * FACE.cover[0],
  (0.5 - py / FACE.height) * PHONE.size[1] * FACE.cover[1],
  PHONE.size[2] / 2,
];

export const keyLocal = (key: Key): Vec3 => faceLocal(keyPixel(key));

const SCREEN_RIGHT = SCREEN.left + SCREEN.width;
const SCREEN_BOTTOM = SCREEN.top + SCREEN.height;

export const SCREEN_CENTRE = faceLocal([SCREEN.left + SCREEN.width / 2, SCREEN.top + SCREEN.height / 2]);

export const SCREEN_CORNERS: readonly Vec3[] = [
  faceLocal([SCREEN.left, SCREEN.top]),
  faceLocal([SCREEN_RIGHT, SCREEN.top]),
  faceLocal([SCREEN.left, SCREEN_BOTTOM]),
  faceLocal([SCREEN_RIGHT, SCREEN_BOTTOM]),
];

const FIST_CLEARANCE = 0.002;
const FIST_REACH =
  Math.max(...KAREN_SKELETON.hand.size) + OUTLINE + PHONE.ink + FIST_CLEARANCE;

export const PALM: Vec3 = [
  0,
  -0.025,
  -(
    PHONE.size[2] / 2 +
    PHONE.ink +
    Math.max(...KAREN_SKELETON.hand.size) +
    OUTLINE +
    FIST_CLEARANCE
  ),
];

const GRIP_PATH = aroundCorner(
  [-PHONE.size[1] / 2, 0],
  [-PHONE.size[1] / 2, -PHONE.size[2] / 2],
  [PALM[1], -PHONE.size[2] / 2],
  FIST_REACH,
);

export const gripPoint = (u: number): Vec3 => {
  const [y, z] = GRIP_PATH(u);
  return [0, y, z];
};
