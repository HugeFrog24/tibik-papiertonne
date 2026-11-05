import {
  planGait,
  plantFeet,
  type GaitPlan,
  type GaitStyle,
  type Ground,
  type RootAt,
  type Step,
} from "../characters/gait";
import { lazy } from "../physics/lazy";
import type { Character } from "../physics/guards";
import type { Vec3 } from "../toon/primitives";
import { RIG, type TibikPose } from "./rig";

export type TibikFrame = {
  readonly position: Vec3;
  readonly rotationY: number;
  readonly pose: TibikPose;
  readonly holdingBox: boolean;
};

export const TIBIK_GAIT: GaitStyle = { stride: 0.72, plantAt: 0.4, lift: 0.06, heelStrike: 0.42, heelRoll: 0.06, toeOff: 0.6, toeRoll: 0.12 };

export const asCharacter = (f: TibikFrame): TibikFrame & Character => ({ ...f, skeleton: RIG });

export const tibikGaitOf = (
  root: RootAt,
  steps: () => readonly Step[],
  end: number,
  ground?: Ground,
  surface?: Ground,
) => lazy(() => planGait(RIG, TIBIK_GAIT, root, steps(), [-1, end], ground, surface));

export const plantedTibik = (
  plan: GaitPlan,
  t: number,
  placed: Omit<TibikFrame, "holdingBox">,
  holdingBox = false,
): TibikFrame => ({
  ...placed,
  pose: plantFeet(plan, t, placed),
  holdingBox,
});
