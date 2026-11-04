import type { Vec3 } from "../toon/primitives";
import { taperedPole, type Wrap } from "./wraps";

export const TREE_POSITION: Vec3 = [-4.2, 0, 1.15];
export const MORE_TREES = [-80, -48, -22, 20, 46, 78];
export const STREET_TREE_XS = [TREE_POSITION[0], ...MORE_TREES];

export const TRUNK = taperedPole([0.09, 0.13], 3.2, 16);

export const TREE_TAG: Wrap<"tag"> = {
  face: 11,
  faces: 2,
  bottom: 1.95,
  height: 0.05,
  design: "tag",
};

export type TreeSide = "near" | "far";

const ALONG: Record<TreeSide, readonly number[]> = {
  near: [...STREET_TREE_XS].sort((a, b) => a - b),
  far: [...MORE_TREES].sort((a, b) => a - b),
};
const FIRST: Record<TreeSide, number> = {
  near: 101,
  far: 101 + STREET_TREE_XS.length,
};

export const treeNumber = (side: TreeSide, x: number) => {
  const index = ALONG[side].indexOf(x);
  if (index < 0) throw new Error(`no ${side} street tree at ${x}`);
  return String(FIRST[side] + index);
};

export const STREET_TREES: readonly {
  readonly side: TreeSide;
  readonly x: number;
  readonly number: string;
}[] = (["near", "far"] as const).flatMap((side) =>
  ALONG[side].map((x) => ({ side, x, number: treeNumber(side, x) })),
);
