import type { Pose } from "../characters/skeleton";
import type { Character } from "../physics/guards";
import type { Vec3 } from "../toon/primitives";
import { KAREN_SKELETON } from "./rig";

export type KarenFrame = {
  readonly position: Vec3;
  readonly rotationY: number;
  readonly pose: Pose;
  readonly mouthOpen: number;
  readonly pointing: boolean;
};

export const asKaren = (k: KarenFrame): KarenFrame & Character => ({
  ...k,
  skeleton: KAREN_SKELETON,
});
