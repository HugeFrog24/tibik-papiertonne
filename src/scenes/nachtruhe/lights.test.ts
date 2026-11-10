import { expect, test } from "vitest";
import { RAIN } from "../../sound/rain";
import { rainLevelAt } from "./soundCues";
import { FPS } from "../../frameRate";
import { OPENINGS, flatWindow, openingsOf, type Opening } from "../../street/building";
import { WEATHER } from "../../weather/overcast";
import { PANE, curtainPanels } from "../../building/bedroomShape";
import { NACHTRUHE_DURATION, NACHTRUHE_SHOTS } from "./cameras";
import { FAR, HIS, LIGHTS, nachtruheWorldAt } from "./choreography";
import { DAWN, DRONE, KAREN_OUT } from "./timeline";

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
});

test("in the morning he leaves his lamp off: the day is up, and he opens the curtains anyway", () => {
  for (const t of frames.filter((f) => f >= DAWN[0])) expect(nachtruheWorldAt(t).lamps[HIS], t.toFixed(2)).toBe(false);
});

test("dusk turns to night, the grey dawn breaks while the camera rises and blends into the rain, and the morning hands the epilogue its rainy world", () => {
  expect(nachtruheWorldAt(0).look).toEqual(WEATHER.dusk);
  expect(nachtruheWorldAt(shot("Drone rise").from).look).toEqual(WEATHER.night);
  expect(nachtruheWorldAt(shot("Drone rise").from).rain).toBe(0);
  expect(nachtruheWorldAt(DAWN[0]).look).not.toEqual(WEATHER.rain);
  expect(nachtruheWorldAt(shot("Drone rise").to).rain).toBe(1);
  expect(nachtruheWorldAt(NACHTRUHE_DURATION).look).toEqual(WEATHER.rain);
  expect(nachtruheWorldAt(NACHTRUHE_DURATION).lampsOn).toBe(false);
  expect(nachtruheWorldAt(NACHTRUHE_DURATION).curtains[0]).toBe(0);
  expect(curtainPanels(nachtruheWorldAt(NACHTRUHE_DURATION).curtains)[1].x0).toBeGreaterThan(PANE.x1);
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

test("of his flat only the bedroom lights: the living-room lamp stays off all Nachtruhe, so nothing glows through the facade from it", () => {
  for (let t = 0; t <= NACHTRUHE_DURATION; t += 0.5) expect(nachtruheWorldAt(t).livingRoomLit, `${t} s`).toBe(false);
});

test("the night passes while the camera rises: the neighbours' windows go out in the first half of the crane shot, Karen's last as the dawn breaks over its second half, and the shot ends on the morning; there is no separate dawn shot", () => {
  expect(NACHTRUHE_SHOTS.map((s) => s.name)).not.toContain("Dawn");
  expect(shot("Drone rise").to).toBe(shot("Bedroom: morning").from);
  expect(DAWN[1]).toBe(DRONE[1]);
  expect(DAWN[0]).toBeGreaterThan(DRONE[0] + (DRONE[1] - DRONE[0]) / 3);
  expect(DAWN[0]).toBeLessThanOrEqual(DRONE[0] + (DRONE[1] - DRONE[0]) / 2);
  expect(KAREN_OUT).toBeLessThan((DAWN[0] + DAWN[1]) / 2);
});

test("the rain builds up through the night: a drizzle early in the crane shot, swelling without a jump, full only as the morning comes, and heard as it is seen", () => {
  const share = (t: number) => nachtruheWorldAt(t).rain;
  const [from, to] = DRONE;
  expect(share(from)).toBe(0);
  expect(share(from + (to - from) * 0.3)).toBeGreaterThan(0);
  expect(share(from + (to - from) * 0.3)).toBeLessThan(0.25);
  expect(share(to)).toBe(1);
  for (let t = from; t < to; t += 1 / 30) {
    expect(share(t + 1 / 30), t.toFixed(2)).toBeGreaterThanOrEqual(share(t));
    expect(share(t + 1 / 30) - share(t), t.toFixed(2)).toBeLessThan(0.03);
    expect(rainLevelAt(t)).toBeCloseTo(RAIN.volume * share(t), 12);
  }
});
