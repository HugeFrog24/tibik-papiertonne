import { Vector3 } from "three";
import { partObb, sphere, type Obb, type Solid } from "../physics/collision";
import { ACROSS_STREET, BALCONIES, BLOCK_SPAN, CORNICE, FACADE_Z, KERB_DEPTH, KERB_HEIGHT, KERB_Y, KERB_Z, acrossZ, balconyParts, type Part } from "./building";
import { STREET_LENGTH } from "./roadShape";
import { facadePieces } from "./facade";
import { BIN_SPACING, BIN_Z, NEIGHBOUR_BINS, ROW_PARTS, STREET_SOLIDS } from "./layout";
import { tonneColliders } from "./tonneShape";
import { roofParts } from "./townShape";
import { MORE_TREES, TREE_POSITION, TRUNK } from "./trees";
import { poleBox } from "./wraps";

export const RAINED_ON_BLOCKS = [-1, 0, 1] as const;

const along = (part: Part, dx: number): Part => ({ ...part, center: [part.center[0] + dx, part.center[1], part.center[2]] });

const across = (part: Part): Part => ({ ...part, center: [ACROSS_STREET.shift - part.center[0], part.center[1], acrossZ(part.center[2])] });

const turnedAcross = (o: Obb): Obb => ({
  ...o,
  center: new Vector3(ACROSS_STREET.shift - o.center.x, o.center.y, acrossZ(o.center.z)),
  axes: [o.axes[0].clone().negate(), o.axes[1].clone(), o.axes[2].clone().negate()],
});

const balconies = (dx: number, slabs: boolean): Part[] =>
  BALCONIES.flatMap((b) =>
    balconyParts(b.y)
      .filter((p) => slabs || p.name !== "slab")
      .map((p): Part => ({ name: `balcony ${p.name}`, center: [dx + b.x + p.center[0], b.y + p.center[1], FACADE_Z + p.center[2]], size: p.size })),
  );

const DOME = roofParts().find((p) => p.name === "smoke vent dome")!;
const ROOF = roofParts().filter((p) => p !== DOME);
const domeOn = (dx: number) =>
  sphere("smoke vent dome", new Vector3(DOME.center[0] + dx, DOME.center[1] - DOME.size[1] / 2, DOME.center[2]), DOME.size[1]);

const blockParts = (n: number): Part[] => {
  const dx = n * BLOCK_SPAN;
  return [...ROOF.map((p) => along(p, dx)), along(CORNICE, dx), ...balconies(dx, n !== 0)];
};

const ROW: Part[] = RAINED_ON_BLOCKS.flatMap(blockParts);
const DOMES = RAINED_ON_BLOCKS.map((n) => domeOn(n * BLOCK_SPAN));

const FAR_ROW: Part[] = [
  ...facadePieces(),
  ...ROW_PARTS,
  ...balconies(0, false),
  ...RAINED_ON_BLOCKS.flatMap((n) => [...ROOF.map((p) => along(p, n * BLOCK_SPAN)), along(CORNICE, n * BLOCK_SPAN), ...(n === 0 ? [] : balconies(n * BLOCK_SPAN, true))]),
].map(across);
const FAR_DOMES = RAINED_ON_BLOCKS.map((n) => {
  const dome = domeOn(n * BLOCK_SPAN);
  return { ...dome, center: new Vector3(ACROSS_STREET.shift - dome.center.x, dome.center.y, acrossZ(dome.center.z)) };
});

const KERB: Part = { name: "kerb", center: [0, KERB_Y, KERB_Z], size: [STREET_LENGTH, KERB_HEIGHT, KERB_DEPTH] };
const KERBS: Part[] = [KERB, across(KERB)];

const trunk = (x: number): Part => ({ name: "tree trunk", center: [x, TRUNK.height / 2, TREE_POSITION[2]], size: poleBox(TRUNK) });
const TRUNKS: Part[] = [...MORE_TREES.map(trunk), ...MORE_TREES.map((x) => across(trunk(x)))];

const binsOf = (n: number): Obb[] =>
  NEIGHBOUR_BINS.flatMap((kind, k) => tonneColliders(`${kind} bin next door`, [n * BLOCK_SPAN + k * BIN_SPACING, 0, BIN_Z], 0));
const BINS: Obb[] = RAINED_ON_BLOCKS.filter((n) => n !== 0).flatMap((n) => {
  const near = binsOf(n);
  return [...near, ...near.map(turnedAcross)];
});

export const RAIN_SOLIDS: readonly Solid[] = [
  ...STREET_SOLIDS,
  ...[...ROW, ...FAR_ROW, ...TRUNKS, ...KERBS].map(partObb),
  ...DOMES,
  ...FAR_DOMES,
  ...BINS,
];
