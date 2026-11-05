import { expect, test } from "vitest";
import { FPS } from "../../frameRate";
import { OPENINGS, flatWindow, openingsOf, type Opening } from "../../street/building";
import { WEATHER } from "../../weather/overcast";
import { NACHTRUHE_DURATION, NACHTRUHE_SHOTS } from "./cameras";
import { FAR, HIS, LIGHTS, nachtruheWorldAt } from "./choreography";

const frames = Array.from({ length: Math.round(NACHTRUHE_DURATION * FPS) + 1 }, (_, f) => f / FPS);
const shot = (name: string) => NACHTRUHE_SHOTS.find((s) => s.name === name)!;
const firstOn = (lit: (t: number) => boolean) => frames.find(lit) ?? Infinity;
const lastOn = (lit: (t: number) => boolean) => [...frames].reverse().find(lit) ?? -Infinity;
const his = flatWindow(12, 1, "links");
const hers = flatWindow(12, 1, "rechts");
const stairs = OPENINGS.filter((o) => o.kind === "stairs");
const same = (a: Opening, b: Opening) => a.kind === b.kind && a.x === b.x && a.storey === b.storey;

test("the lights change in order: at dusk the street lamps, then the entrance lamp, the stairwell and his window; his window dark when the drone opens; Karen's the last to go out", () => {
  const at = nachtruheWorldAt;
  const lamps = firstOn((t) => at(t).lampsOn);
  const entrance = firstOn((t) => at(t).entranceLamp);
  const stairwell = firstOn((t) => stairs.every((o) => at(t).windowLight(12, o) > 0));
  const window = firstOn((t) => at(t).windowLight(12, his) > 0);
  expect(lamps).toBeLessThan(entrance);
  expect(entrance).toBeLessThan(stairwell);
  expect(stairwell).toBeLessThan(window);
  expect(window).toBeLessThan(shot("Dusk wide").to);
  expect(at(shot("Drone rise").from).windowLight(12, his)).toBe(0);
  const karen = lastOn((t) => t < shot("Bedroom: morning").from && at(t).windowLight(12, hers) > 0);
  expect(karen).toBeGreaterThan(shot("Drone rise").from);
  expect(karen).toBeLessThan(shot("Drone rise").to);
  for (const house of [12, 13])
    for (const o of openingsOf(house)) {
      if (house === 12 && (same(o, his) || same(o, hers))) continue;
      const last = lastOn((t) => t < shot("Bedroom: morning").from && at(t).windowLight(house, o) > 0);
      expect(last, `${house} ${o.kind} ${o.x},${o.storey}`).toBeLessThan(karen);
    }
  expect(at(shot("Drone rise").to - 0.1).town).toBeGreaterThan(0);
  expect(at(shot("Drone rise").to - 0.1).town).toBeLessThan(at(shot("Drone rise").from).town);
  expect(at(shot("Bedroom: morning").from).town).toBe(0);
});

test("his window glows exactly while his bedside lamp is on, and the far lamp stays off all night", () => {
  for (const t of frames) {
    const world = nachtruheWorldAt(t);
    expect(world.windowLight(12, his) > 0, t.toFixed(2)).toBe(world.lamps[HIS]);
    expect(world.lamps[FAR], t.toFixed(2)).toBe(false);
  }
  expect(nachtruheWorldAt(shot("Bedroom: evening").from + 0.5).lamps[HIS]).toBe(true);
  expect(nachtruheWorldAt(shot("Bedroom: evening").to - 0.2).lamps[HIS]).toBe(false);
  expect(nachtruheWorldAt(shot("Bedroom: morning").to - 0.5).lamps[HIS]).toBe(true);
});

test("dusk turns to night, one grey dawn blends into the rain, and the morning hands the epilogue its rainy world", () => {
  expect(nachtruheWorldAt(0).look).toEqual(WEATHER.dusk);
  expect(nachtruheWorldAt(shot("Drone rise").from).look).toEqual(WEATHER.night);
  expect(nachtruheWorldAt(shot("Dawn").from).rain).toBe(true);
  expect(nachtruheWorldAt(shot("Dawn").from - 0.1).rain).toBe(false);
  expect(nachtruheWorldAt(NACHTRUHE_DURATION).look).toEqual(WEATHER.rain);
  expect(nachtruheWorldAt(NACHTRUHE_DURATION).lampsOn).toBe(false);
  expect(nachtruheWorldAt(NACHTRUHE_DURATION).curtains[0]).toBe(0);
  expect(nachtruheWorldAt(NACHTRUHE_DURATION).curtains[1]).toBeGreaterThan(0.95);
  expect(nachtruheWorldAt(shot("Bedroom: evening").from).curtains).toEqual([0, 0]);
  expect(nachtruheWorldAt(shot("Bedroom: evening").to - 0.1).blanket).toBeGreaterThan(0.95);
  expect(LIGHTS.stairwell[1]).toBeLessThanOrEqual(shot("Drone rise").from);
});

test("before the morning every window is lit for one unbroken stretch at most, and of his flat only the bedroom glows", () => {
  const night = frames.filter((t) => t < shot("Bedroom: morning").from);
  for (const house of [12, 13])
    for (const o of openingsOf(house)) {
      const lit = night.map((t) => nachtruheWorldAt(t).windowLight(house, o) > 0);
      const switches = lit.filter((on, i) => i > 0 && on !== lit[i - 1]).length;
      expect(switches, `${house} ${o.kind} ${o.x},${o.storey}`).toBeLessThanOrEqual(lit[0] ? 1 : 2);
      const hisFlat = house === 12 && o.storey === his.storey && o.x < -1.9 && o.kind !== "stairs" && !same(o, his);
      if (hisFlat) expect(lit.some(Boolean), `his flat's ${o.kind} at ${o.x}`).toBe(false);
    }
});
