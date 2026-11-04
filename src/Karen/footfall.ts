import { footColliders, type Placement } from "../characters/skeleton";
import { KAREN_SKELETON } from "./rig";

export const footfallOffset = (karen: Placement, side: 1 | -1) => {
  const s = footColliders(KAREN_SKELETON, karen, side);
  const foot = s[Math.floor(s.length / 2)].center;
  const dx = foot.x - karen.position[0];
  const dz = foot.z - karen.position[2];
  return Math.abs(
    dx * Math.cos(karen.rotationY) - dz * Math.sin(karen.rotationY),
  );
};
