import { Vector2 } from "three";
import { expect, test } from "vitest";
import { KAREN_SKELETON } from "../Karen/rig";
import { RIG } from "../Tibik/rig";
import { torsoProfile, torsoSurface, type Skeleton } from "./skeleton";
import { torsoLathe } from "./torsoShape";

const FLOAT32_DIGITS = 6;

test.each([
  ["Karen", KAREN_SKELETON],
  ["Tibik", RIG],
] as [string, Skeleton][])("%s: the drawn torso is exactly the surface her colliders use: every lathe vertex, depth-scaled, lies on torsoSurface", (_name, skeleton) => {
  const points = torsoProfile(skeleton);
  const plain = torsoLathe(points, { ...skeleton, torso: { ...skeleton.torso, bulges: [] } }).attributes["position"];
  const drawn = torsoLathe(points, skeleton).attributes["position"];
  for (let i = 0; i < drawn.count; i++) {
    const [x, y, z] = [plain.getX(i), plain.getY(i), plain.getZ(i)];
    const radius = Math.hypot(x, z);
    if (radius < 1e-9) continue;
    const surface = torsoSurface(skeleton, new Vector2(radius, y), Math.atan2(z, x));
    expect(drawn.getX(i), `vertex ${i} x`).toBeCloseTo(surface.x, FLOAT32_DIGITS);
    expect(drawn.getY(i), `vertex ${i} y`).toBeCloseTo(surface.y, FLOAT32_DIGITS);
    expect(drawn.getZ(i) * skeleton.torso.depthScale, `vertex ${i} z`).toBeCloseTo(surface.z, FLOAT32_DIGITS);
  }
});
