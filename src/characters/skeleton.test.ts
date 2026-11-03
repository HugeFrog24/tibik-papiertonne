import { expect, test } from "vitest";
import { KAREN_REST, KAREN_SKELETON } from "../Karen/rig";
import { RIG, TIBIK_REST } from "../Tibik/rig";
import { bodyColliders, torsoProfile, type Pose, type Skeleton } from "./skeleton";

const characters: [string, Skeleton, Pose][] = [
  ["Tibik", RIG, TIBIK_REST],
  ["Karen", KAREN_SKELETON, KAREN_REST],
];

test.each(characters)("%s: no torso collision sphere hangs below the bottom of the torso", (_name, skeleton, pose) => {
  const lowest = skeleton.hipHeight + Math.min(...torsoProfile(skeleton).map((p) => p.y));
  for (const s of bodyColliders(skeleton, { position: [0, 0, 0], rotationY: 0, pose }).torso) {
    expect(s.center.y - s.radius).toBeGreaterThanOrEqual(lowest - 1e-9);
  }
});
