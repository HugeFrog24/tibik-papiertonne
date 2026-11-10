import { KERB_DEPTH, KERB_Z, acrossZ } from "./building";
import { footprint } from "./footprint";

export const GULLY = { along: 0.5, across: 0.3, gap: 0.01 };
export const MANHOLE = { opening: 0.625, frame: 0.785 };

export const kerbFace = (far: boolean) =>
  far ? acrossZ(KERB_Z) - KERB_DEPTH / 2 : KERB_Z + KERB_DEPTH / 2;

export type Gully = {
  readonly x: number;
  readonly z: number;
  readonly far: boolean;
};

const gullyAt =
  (far: boolean) =>
  (x: number): Gully => ({
    x,
    far,
    z: kerbFace(far) + (far ? -1 : 1) * (GULLY.gap + GULLY.across / 2),
  });

export const GULLIES: readonly Gully[] = [
  ...[-110, -90, -70, -50, -33, -15, 1.2, 14.2, 29, 45, 65, 85, 105].map(
    gullyAt(false),
  ),
  ...[-108, -88, -68, -48, -23, -4.5, 11, 22, 40, 60, 80, 102].map(
    gullyAt(true),
  ),
];

export const gullyFootprint = (g: Gully) =>
  footprint(g.x, g.z, GULLY.along, GULLY.across);

export const MANHOLES = [-105, -70, -35, 0, 35, 70, 105].map((x) => ({
  x,
  z: (kerbFace(false) + kerbFace(true)) / 2,
}));

export const manholeFootprint = (m: {
  readonly x: number;
  readonly z: number;
}) => footprint(m.x, m.z, MANHOLE.frame, MANHOLE.frame);
