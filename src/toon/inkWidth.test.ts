import { expect, test } from "vitest";
import {
  BackSide,
  BoxGeometry,
  Group,
  Line,
  Mesh,
  MeshBasicMaterial,
  MeshToonMaterial,
} from "three";
import { INK_PASS, NO_INK, inkRadius, skipsInkIds } from "./inkWidth";

test("the drawn line is one outline wide on screen: 1.4 cm at the part's depth, in pixels", () => {
  const px = inkRadius(0.014, 1080, 50, 2);
  const visibleHeight = 2 * 2 * Math.tan((50 * Math.PI) / 360);
  expect(px).toBeCloseTo((0.014 / visibleHeight) * 1080, 9);
  expect(inkRadius(0.014, 1080, 50, 4)).toBeCloseTo(px / 2, 9);
});

test("the sampling rings reach out to the widest line and start close to the pixel", () => {
  expect(Math.max(...INK_PASS.rings)).toBe(1);
  expect(Math.min(...INK_PASS.rings) * INK_PASS.maxRadius).toBeLessThanOrEqual(
    1.5,
  );
  expect(INK_PASS.turns).toBeGreaterThanOrEqual(8);
});

test("ink hulls, lines and things too small for an outline stay out of the id pass", () => {
  const hull = new Mesh(
    new BoxGeometry(),
    new MeshBasicMaterial({ side: BackSide }),
  );
  const part = new Mesh(new BoxGeometry(), new MeshToonMaterial());
  const fly = new Group();
  fly.userData = { ...NO_INK };
  expect(skipsInkIds(hull)).toBe(true);
  expect(skipsInkIds(new Line())).toBe(true);
  expect(skipsInkIds(fly)).toBe(true);
  expect(skipsInkIds(part)).toBe(false);
});
