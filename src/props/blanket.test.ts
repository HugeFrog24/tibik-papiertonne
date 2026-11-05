import { expect, test } from "vitest";
import { BED_RECT } from "../building/bedroomShape";
import { allColliders, bodyColliders } from "../characters/skeleton";
import { LYING } from "../Tibik/bedPoses";
import { RIG } from "../Tibik/rig";
import { OUTLINE } from "../toon/primitives";
import { BLANKET, blanketEdge, blanketSurface } from "./blanketShape";

const placement = (() => {
  const probe = allColliders(RIG, { position: [0, 0, 0], rotationY: Math.PI / 2, pose: LYING, tilt: Math.PI / 2 });
  const lift = BED_RECT.top - Math.min(...probe.map((s) => s.center.y - s.radius));
  return { position: [BED_RECT.x0 + 1.0, lift, (BED_RECT.z0 + BED_RECT.z1) / 2] as [number, number, number], rotationY: Math.PI / 2, pose: LYING, tilt: Math.PI / 2 };
})();
const body = allColliders(RIG, placement);

test("the blanket never passes through him or the mattress, outlines included", () => {
  for (const cover of [0, 0.5, 1]) {
    const height = blanketSurface(BED_RECT, body, cover);
    const edge = blanketEdge(BED_RECT, body, cover);
    for (let i = 0; i <= 40; i++)
      for (let j = 0; j <= 40; j++) {
        const x = edge + ((BED_RECT.x1 - edge) * i) / 40;
        const z = BED_RECT.z0 + ((BED_RECT.z1 - BED_RECT.z0) * j) / 40;
        const h = height(x, z);
        expect(h).toBeGreaterThanOrEqual(BED_RECT.top + 0.008);
        for (const s of body) {
          const reach = s.radius + OUTLINE / 2;
          const d = Math.hypot(x - s.center.x, z - s.center.z);
          if (d < reach) expect(h, `${s.name} at ${x.toFixed(2)},${z.toFixed(2)}, cover ${cover}`).toBeGreaterThanOrEqual(s.center.y + Math.sqrt(reach * reach - d * d));
        }
      }
  }
});

test("pulled up it reaches his chest, folded it lies at the foot", () => {
  const chest = bodyColliders(RIG, placement).upperTorso;
  const chestX = chest.reduce((sum, s) => sum + s.center.x, 0) / chest.length;
  expect(Math.abs(blanketEdge(BED_RECT, body, 1) - chestX)).toBeLessThan(0.12);
  const folded = blanketEdge(BED_RECT, body, 0);
  expect(BED_RECT.x1 - folded).toBeGreaterThan(0.25);
  expect(BED_RECT.x1 - folded).toBeLessThan(0.55);
  expect(blanketEdge(BED_RECT, body, 0.5)).toBeGreaterThan(blanketEdge(BED_RECT, body, 1));
  expect(blanketEdge(BED_RECT, body, 0.5)).toBeLessThan(folded);
  expect(BLANKET.color).toBe("#3b3f45");
});

test("folded at the foot it lies in layers, thicker than one ply", () => {
  const height = blanketSurface(BED_RECT, [], 0);
  const middle = (BED_RECT.z0 + BED_RECT.z1) / 2;
  expect(height(BED_RECT.x1 - 0.1, middle) - BED_RECT.top).toBeGreaterThan(0.02);
  expect(blanketSurface(BED_RECT, [], 1)(BED_RECT.x1 - 0.1, middle) - BED_RECT.top).toBeLessThan(0.015);
});
