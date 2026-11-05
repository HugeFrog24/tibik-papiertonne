import { expect, test } from "vitest";
import { LAMP, STREET_LAMPS } from "../street/lamps";
import { WEATHER } from "./overcast";
import { rainLight } from "./rainLight";

const lamp = STREET_LAMPS.find((l) => l.x === -16)!;
const underIt: [number, number, number] = [lamp.x, 2.5, lamp.z + lamp.toward * LAMP.arm];
const farFromAny: [number, number, number] = [lamp.x + 15, 2.5, lamp.z];

test("rain is seen by the light that falls on it: none in the dark night, all of it under the rainy day's sky", () => {
  expect(rainLight(WEATHER.night, false)(farFromAny).level).toBe(0);
  expect(rainLight(WEATHER.night, false)(underIt).level).toBe(0);
  expect(rainLight(WEATHER.rain, false)(farFromAny)).toEqual({ level: 1, warmth: 0 });
  expect(rainLight(WEATHER.rain, true)(underIt).level).toBe(1);
});

test("at night the drops show only in a street lamp's cone, lit in its warm light", () => {
  const lit = rainLight(WEATHER.night, true);
  expect(lit(underIt).level).toBeGreaterThan(0.5);
  expect(lit(underIt).warmth).toBe(1);
  expect(lit(farFromAny).level).toBe(0);
  expect(lit([lamp.x, LAMP.height + 1, lamp.z + lamp.toward * LAMP.arm]).level).toBe(0);
});

test("as the day comes up the drops grow brighter and less warm", () => {
  const dawn = rainLight({ ...WEATHER.rain, hemisphere: { ...WEATHER.rain.hemisphere, intensity: WEATHER.rain.hemisphere.intensity * 0.6 } }, true);
  const night = rainLight(WEATHER.night, true);
  expect(dawn(farFromAny).level).toBeGreaterThan(night(farFromAny).level);
  expect(dawn(underIt).warmth).toBeLessThan(1);
});
