import { Euler, Vector3 } from "three";
import {
  footCenter,
  legFramesOf,
  type Placement,
  type Side,
  type Skeleton,
} from "../characters/skeleton";
import { soleGrid } from "../characters/soleGrid";
import { INK_WIDTH, KAREN_SKELETON } from "../Karen/rig";
import { frame } from "../physics/collision";
import { RIG } from "../Tibik/rig";
import { FPS } from "../timeline";
import { OUTLINE, type Vec3 } from "../toon/primitives";
import { mm } from "./sceneChecks";

export type Drawn = {
  readonly skeleton: Skeleton;
  readonly drop: number;
  readonly yaw: number;
  readonly size: Vec3;
  readonly outline: number;
};

export const KAREN_SHOE: Drawn = {
  skeleton: KAREN_SKELETON,
  drop: KAREN_SKELETON.shoe!.drop,
  yaw: KAREN_SKELETON.shoe!.yaw,
  size: KAREN_SKELETON.shoe!.size,
  outline: INK_WIDTH,
};

export const TIBIK_FOOT: Drawn = {
  skeleton: RIG,
  drop: 0,
  yaw: 0,
  size: RIG.foot.size,
  outline: OUTLINE,
};

const underside = (drawn: Drawn, placement: Placement, side: Side) => {
  const ankle = legFramesOf(drawn.skeleton, placement, side).ankle;
  const [x, y, z] = footCenter(drawn.skeleton, side);
  const shoe = frame(
    ankle,
    [x, y - drawn.drop, z],
    new Euler(0, side * drawn.yaw, 0),
  );
  return soleGrid(drawn.size).map(({ u, v, drop }) =>
    new Vector3(v, -drop, u).applyMatrix4(shoe),
  );
};

export const sunkSoles = (
  drawn: Drawn,
  placementAt: (t: number) => Placement,
  from: number,
  to: number,
  ground: (x: number, z: number) => number,
) => {
  const problems: string[] = [];
  for (let f = Math.ceil(from * FPS); f < to * FPS; f++) {
    const t = f / FPS;
    const placement = placementAt(t);
    for (const side of [1, -1] as const) {
      const depth = Math.max(
        ...underside(drawn, placement, side).map(
          (p) => ground(p.x, p.z) - (p.y - drawn.outline),
        ),
      );
      if (depth > 1e-9)
        problems.push(
          `${t.toFixed(2)} s: foot ${side} ${mm(depth)} into the ground`,
        );
    }
  }
  return problems;
};
