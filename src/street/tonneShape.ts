import { Euler, Matrix4 } from "three";
import { frame, obb, type Obb } from "../physics/collision";
import type { Vec3 } from "../toon/primitives";

export type TonneKind = "papier" | "rest" | "gelb";

const LID = { thickness: 0.05, overhang: 0.08, wider: 0.06, above: 0.005 };
const GRIP = { size: [0.035, 0.03, 0.12] as Vec3, fromSide: 0.07, fromFront: 0.03 };
const GRIP_SIDES = [1, -1] as const;
const BACK_BAR = { gap: 0.05, thickness: 0.035, width: 0.5, below: 0.03 };

const BODY = { width: 0.58, depth: 0.74, height: 1.04 };
const LID_LENGTH = BODY.depth + LID.overhang;
const LID_WIDTH = BODY.width + LID.wider;

export const TONNE = {
  ...BODY,
  taper: 0.88,
  wall: 0.03,
  lid: {
    hinge: [0, BODY.height + LID.above, -BODY.depth / 2] as Vec3,
    center: [0, LID.thickness / 2 + LID.above, LID_LENGTH / 2] as Vec3,
    size: [LID_WIDTH, LID.thickness, LID_LENGTH] as Vec3,
    grips: GRIP_SIDES.map((side) => ({
      center: [
        side * (LID_WIDTH / 2 - GRIP.fromSide),
        LID.thickness + LID.above + GRIP.size[1] / 2,
        LID_LENGTH - GRIP.fromFront - GRIP.size[2] / 2,
      ] as Vec3,
      size: GRIP.size,
    })),
  },
  backBar: {
    center: [0, BODY.height - BACK_BAR.below, -BODY.depth / 2 - BACK_BAR.gap - BACK_BAR.thickness / 2] as Vec3,
    size: [BACK_BAR.width, BACK_BAR.thickness, BACK_BAR.thickness] as Vec3,
    posts: ([1, -1] as const).map((side) => ({
      center: [side * (BACK_BAR.width / 2 - BACK_BAR.thickness / 2), BODY.height - BACK_BAR.below, -BODY.depth / 2 - BACK_BAR.gap / 2] as Vec3,
      size: [BACK_BAR.thickness, BACK_BAR.thickness, BACK_BAR.gap] as Vec3,
    })),
  },
} as const;

export const TONNE_FLOOR = 0.06;

export const tonneLidParts = (
  name: string,
  position: Vec3,
  lidOpen: number,
  margin = 0,
): Obb[] => {
  const hinge = frame(
    frame(new Matrix4(), position),
    TONNE.lid.hinge,
    new Euler(-lidOpen, 0, 0),
  );
  const grown = (size: Vec3): Vec3 => [
    size[0] + 2 * margin,
    size[1] + 2 * margin,
    size[2] + 2 * margin,
  ];
  return [
    obb(`${name} lid`, hinge, grown(TONNE.lid.size), TONNE.lid.center),
    ...TONNE.lid.grips.map((grip) => obb(`${name} lid grip`, hinge, grown(grip.size), grip.center)),
  ];
};

export const tonneLidGrip = (name: string, position: Vec3, lidOpen: number, side: 1 | -1): Obb =>
  tonneLidParts(name, position, lidOpen)[1 + GRIP_SIDES.indexOf(side)];

export const tonneLid = (name: string, position: Vec3, lidOpen: number): Obb =>
  tonneLidParts(name, position, lidOpen)[0];

export const tonneColliders = (
  name: string,
  position: Vec3,
  lidOpen: number,
): Obb[] => {
  const { width: w, depth: d, height: h, taper, wall } = TONNE;
  const base = frame(new Matrix4(), position);
  const meanW = (w * (1 + taper)) / 2;
  const meanD = (d * (1 + taper)) / 2;
  const tiltFront = Math.atan(((d / 2) * (1 - taper)) / h);
  const tiltSide = Math.atan(((w / 2) * (1 - taper)) / h);

  return [
    obb(
      `${name} front wall`,
      frame(base, [0, h / 2, meanD / 2 - wall / 2], new Euler(tiltFront, 0, 0)),
      [meanW, h, wall],
    ),
    obb(
      `${name} back wall`,
      frame(
        base,
        [0, h / 2, -meanD / 2 + wall / 2],
        new Euler(-tiltFront, 0, 0),
      ),
      [meanW, h, wall],
    ),
    obb(
      `${name} side wall`,
      frame(base, [meanW / 2 - wall / 2, h / 2, 0], new Euler(0, 0, -tiltSide)),
      [wall, h, meanD],
    ),
    obb(
      `${name} side wall`,
      frame(base, [-meanW / 2 + wall / 2, h / 2, 0], new Euler(0, 0, tiltSide)),
      [wall, h, meanD],
    ),
    obb(`${name} bottom`, frame(base, [0, TONNE_FLOOR / 2, 0]), [
      w * taper,
      TONNE_FLOOR,
      d * taper,
    ]),
    obb(`${name} back bar`, frame(base, TONNE.backBar.center), [...TONNE.backBar.size]),
    ...TONNE.backBar.posts.map((post) => obb(`${name} back bar post`, frame(base, post.center), [...post.size])),
    ...tonneLidParts(name, position, lidOpen),
  ];
};
