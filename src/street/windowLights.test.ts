import { Color, SRGBColorSpace } from "three";
import { expect, test } from "vitest";
import { FACADE_Z, flatWindow, floorLevel } from "./building";
import { LAMP, LAMP_LIGHT, LAMP_POOL, STREET_LAMPS, lampGlow } from "./lamps";

test("Karen's window is across the landing from his", () => {
  const his = flatWindow(12, 1, "links");
  const hers = flatWindow(12, 1, "rechts");
  expect(hers.x).toBe(0.3);
  expect(hers.kind).toBe("window");
  expect(hers.bedroom).toBeFalsy();
  expect(hers.y).toBe(his.y);
  expect(his.y).toBeGreaterThan(floorLevel(1));
  expect(his.y).toBeLessThan(floorLevel(2));
});

test("a lamp head glows only when the lamps are on", () => {
  const off = lampGlow(false);
  const on = lampGlow(true);
  expect(off.lens.light).toBe(0);
  expect(off.light).toBe(0);
  expect(on.lens.light).toBeGreaterThan(0);
  expect(on.light).toBeGreaterThan(0);
  expect(on.lens.color).toBe(LAMP_LIGHT);
});

test("the street lamps are warm-white LEDs of about 3000 K, not the old neutral white", () => {
  const { r, g, b } = new Color(LAMP_LIGHT).getRGB({ r: 0, g: 0, b: 0 }, SRGBColorSpace);
  expect(r).toBeCloseTo(1, 2);
  expect(b / r).toBeGreaterThan(0.36);
  expect(b / r).toBeLessThan(0.5);
  expect(g).toBeGreaterThan(b);
});

test("a street lamp lights only downward, nothing above its head (ULOR 0, as German LED luminaires are bought)", () => {
  expect(LAMP_POOL.angle).toBeLessThan(Math.PI / 2 - 0.2);
  expect(LAMP_POOL.penumbra).toBeGreaterThan(0);
  expect(LAMP_POOL.penumbra).toBeLessThanOrEqual(1);
});

test("a lamp's pool reaches across the pavement to the foot of No. 12, so whoever walks home is lit", () => {
  const head = STREET_LAMPS[0].z + STREET_LAMPS[0].toward * LAMP.arm;
  const across = head - FACADE_Z;
  const drop = LAMP.height - 1.0;
  expect(drop * Math.tan(LAMP_POOL.angle)).toBeGreaterThan(across);
  expect(Math.hypot(drop, across)).toBeLessThan(LAMP_POOL.reach);
});
