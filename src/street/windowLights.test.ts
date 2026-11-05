import { Color, SRGBColorSpace } from "three";
import { expect, test } from "vitest";
import { expectSwitchingOffOneByOne } from "../tooling/switchingOff";
import { curtainOverPane, curtainShape } from "../building/bedroomShape";
import { FACADE_Z, OPENINGS, acrossZ, flatWindow, floorLevel } from "./building";
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

test("from the street his curtain shows exactly where the room's curtain hangs behind the pane", () => {
  const his = flatWindow(12, 1, "links");
  const pane = { x0: his.x - 0.45, x1: his.x + 0.45 };
  expect(curtainOverPane(1, pane)).toBeNull();
  expect(curtainOverPane(0, pane)).toEqual(pane);
  for (const open of [0.2, 0.5, 0.8]) {
    const shape = curtainShape(open);
    const seen = curtainOverPane(open, pane);
    if (shape.x1 <= pane.x0) expect(seen).toBeNull();
    else expect(seen).toEqual({ x0: pane.x0, x1: Math.min(pane.x1, shape.x1) });
  }
});

test("the neighbours' windows light up at night too, a few per house, going out one by one; the stairwells stay on their timers", () => {
  const houses = ["6", "8", "10", "14", "16", "18"];
  const evening = expectSwitchingOffOneByOne(
    (share) => houses.map((house) => neighbourWindowsOn(house, share)),
    houses.length * OPENINGS.length,
    [0.6, 0.2, 0],
  );
  for (const on of evening) for (const k of on) expect(OPENINGS[k].kind).not.toBe("stairs");
  expect([...evening[0]]).not.toEqual([...evening[1]]);
});
