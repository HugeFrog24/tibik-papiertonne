import { Vector3 } from "three";
import { expect, test } from "vitest";
import { KAREN_REST, KAREN_SKELETON } from "../Karen/rig";
import { RIG, TIBIK_REST } from "../Tibik/rig";
import {
  bodyColliders,
  torsoProfile,
  torsoRadiusAt,
  type Pose,
  type Skeleton,
} from "./skeleton";

const characters: [string, Skeleton, Pose][] = [
  ["Tibik", RIG, TIBIK_REST],
  ["Karen", KAREN_SKELETON, KAREN_REST],
];

test.each(characters)(
  "%s: no torso collision sphere hangs below the bottom of the torso",
  (_name, skeleton, pose) => {
    const lowest =
      skeleton.hipHeight + Math.min(...torsoProfile(skeleton).map((p) => p.y));
    for (const s of bodyColliders(skeleton, {
      position: [0, 0, 0],
      rotationY: 0,
      pose,
    }).torso) {
      expect(s.center.y - s.radius).toBeGreaterThanOrEqual(lowest - 1e-9);
    }
  },
);

const worstUncovered = (skeleton: Skeleton, pose: Pose) => {
  const colliders = bodyColliders(skeleton, {
    position: [0, 0, 0],
    rotationY: 0,
    pose,
  });
  const spheres = [...colliders.torso, ...colliders.head, ...colliders.legs];
  let worst = { gap: 0, at: "" };
  for (const p of torsoProfile(skeleton)) {
    if (p.x < 0.05) continue;
    for (let k = 0; k < 72; k++) {
      const a = (k / 72) * 2 * Math.PI;
      const point = new Vector3(
        p.x * Math.cos(a),
        skeleton.hipHeight + p.y,
        p.x * skeleton.torso.depthScale * Math.sin(a),
      );
      const gap = Math.min(
        ...spheres.map((s) => point.distanceTo(s.center) - s.radius),
      );
      if (gap > worst.gap)
        worst = {
          gap,
          at: `y ${p.y.toFixed(3)}, ${((a * 180) / Math.PI).toFixed(0)}°`,
        };
    }
  }
  return worst;
};

test.each(characters)(
  "%s: the collision spheres cover the drawn torso to within 2 cm",
  (_name, skeleton, pose) => {
    const worst = worstUncovered(skeleton, pose);
    expect(worst.gap, worst.at).toBeLessThanOrEqual(0.02);
  },
);

test("the torso radius at any height is read off the first profile segment spanning it, exactly as a straight scan finds it", () => {
  const scan = (points: { x: number; y: number }[], y: number) => {
    for (let i = 0; i < points.length - 1; i++) {
      const [a, b] = [points[i], points[i + 1]];
      if (y >= Math.min(a.y, b.y) && y <= Math.max(a.y, b.y) && a.y !== b.y) {
        const t = (y - a.y) / (b.y - a.y);
        return {
          radius: a.x + (b.x - a.x) * t,
          slope: (b.x - a.x) / (b.y - a.y),
        };
      }
    }
    return { radius: 0, slope: 0 };
  };
  for (const skeleton of [RIG, KAREN_SKELETON]) {
    const points = torsoProfile(skeleton);
    expect(points.every((p, i) => i === 0 || points[i - 1].y < p.y)).toBe(true);
    const lo = points[0].y - 0.05;
    const hi = points[points.length - 1].y + 0.05;
    const heights = [
      ...points.map((p) => p.y),
      ...Array.from({ length: 2000 }, (_, i) => lo + ((hi - lo) * i) / 1999),
    ];
    for (const y of heights)
      expect(torsoRadiusAt(skeleton, y), `y ${y}`).toEqual(scan(points, y));
  }
});

test("asked for the torso radius at a height that is not a number, the lookup answers as the straight scan did: none", () => {
  for (const skeleton of [RIG, KAREN_SKELETON])
    expect(torsoRadiusAt(skeleton, NaN)).toEqual({ radius: 0, slope: 0 });
});
