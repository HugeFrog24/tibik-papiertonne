import { Matrix4, Vector3 } from "three";
import { expect, test } from "vitest";
import { SUN } from "../street/StreetSet";
import { BUILDING_HEIGHT } from "../street/building";
import { STAIRWELL_WALLS_CAST_SHADOWS } from "./StairwellSet";
import { CORE } from "./stairwell";

test("the sun's shadow camera covers the whole staircase, up to the roof", () => {
  const view = new Matrix4()
    .lookAt(new Vector3(...SUN.position), new Vector3(...SUN.target), new Vector3(0, 1, 0))
    .setPosition(new Vector3(...SUN.position))
    .invert();
  const { left, right, top, bottom, near, far } = SUN.shadow;
  for (const x of [CORE.x0 - 0.2, CORE.x1 + 0.2]) {
    for (const y of [0, BUILDING_HEIGHT + 0.3]) {
      for (const z of [CORE.z1 - 0.2, CORE.z0 + 0.4]) {
        const p = new Vector3(x, y, z).applyMatrix4(view);
        expect(p.x).toBeGreaterThanOrEqual(left);
        expect(p.x).toBeLessThanOrEqual(right);
        expect(p.y).toBeGreaterThanOrEqual(bottom);
        expect(p.y).toBeLessThanOrEqual(top);
        expect(-p.z).toBeGreaterThanOrEqual(near);
        expect(-p.z).toBeLessThanOrEqual(far);
      }
    }
  }
});

test("staircase walls cast shadows, so sunlight only comes in through the windows and the door", () => {
  expect(STAIRWELL_WALLS_CAST_SHADOWS).toBe(true);
});
