import { Euler, Matrix4 } from "three";
import { frame, obb, type Obb } from "../physics/collision";
import type { Vec3 } from "../toon/primitives";

export type TonneKind = "papier" | "rest" | "gelb";

export const TONNE = {
  width: 0.58,
  depth: 0.72,
  height: 0.98,
  taper: 0.88,
  wall: 0.03,
  lid: {
    hinge: [0, 0.985, -0.36] as Vec3,
    center: [0, 0.03, 0.39] as Vec3,
    size: [0.64, 0.05, 0.8] as Vec3,
    handle: {
      center: [0, -0.01, 0.78] as Vec3,
      size: [0.32, 0.05, 0.035] as Vec3,
    },
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
    obb(
      `${name} lid handle`,
      hinge,
      grown(TONNE.lid.handle.size),
      TONNE.lid.handle.center,
    ),
  ];
};

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
    ...tonneLidParts(name, position, lidOpen),
  ];
};
