import { Color, SRGBColorSpace } from "three";
import { expect, test } from "vitest";
import { FACADE_Z, OPENINGS, acrossZ, curtainSpan, flatWindow, floorLevel } from "./building";
import { neighbourWindowsOn } from "./lightsOn";
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

test("every lamp's pool reaches across its pavement to the foot of the houses behind it, so whoever walks home is lit", () => {
  const drop = LAMP.height - 1.0;
  for (const lamp of STREET_LAMPS) {
    const head = lamp.z + lamp.toward * LAMP.arm;
    const across = Math.abs(head - (lamp.toward > 0 ? FACADE_Z : acrossZ(FACADE_Z)));
    expect(drop * Math.tan(LAMP_POOL.angle), `lamp at ${lamp.x}`).toBeGreaterThan(across);
    expect(Math.hypot(drop, across), `lamp at ${lamp.x}`).toBeLessThan(LAMP_POOL.reach);
  }
});

test("his curtain hangs from the window's west edge: a gathered strip when open, the whole pane when drawn, never past the frame", () => {
  const inner = 1.0;
  const open = curtainSpan(inner, 0);
  const half = curtainSpan(inner, 0.5);
  const drawn = curtainSpan(inner, 1);
  for (const span of [open, half, drawn, curtainSpan(inner, -0.4), curtainSpan(inner, 1.7)]) {
    expect(span.x0).toBeCloseTo(-inner / 2, 9);
    expect(span.x1).toBeLessThanOrEqual(inner / 2 + 1e-9);
    expect(span.x1).toBeGreaterThan(span.x0);
  }
  expect(drawn.x1).toBeCloseTo(inner / 2, 9);
  expect(open.x1 - open.x0).toBeLessThan(0.25);
  expect(half.x1).toBeGreaterThan(open.x1);
  expect(half.x1).toBeLessThan(drawn.x1);
  expect(curtainSpan(inner, -0.4)).toEqual(open);
  expect(curtainSpan(inner, 1.7)).toEqual(drawn);
});

test("the neighbours' windows light up at night too, a few per house, going out one by one; the stairwells stay on their timers", () => {
  const houses = ["6", "8", "10", "14", "16", "18"];
  let before = houses.map((house) => new Set(neighbourWindowsOn(house, 1)));
  const lit = before.reduce((n, on) => n + on.size, 0) / (houses.length * OPENINGS.length);
  expect(lit).toBeGreaterThan(0.1);
  expect(lit).toBeLessThan(0.35);
  for (const on of before) for (const k of on) expect(OPENINGS[k].kind).not.toBe("stairs");
  expect(JSON.stringify([...before[0]])).not.toBe(JSON.stringify([...before[1]]));
  for (const share of [0.6, 0.2, 0]) {
    const now = houses.map((house) => new Set(neighbourWindowsOn(house, share)));
    now.forEach((on, i) => {
      for (const k of on) expect(before[i].has(k)).toBe(true);
    });
    before = now;
  }
  expect(before.every((on) => on.size === 0)).toBe(true);
});
