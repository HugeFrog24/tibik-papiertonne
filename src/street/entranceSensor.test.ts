import { expect, test } from "vitest";
import { ENTRANCE_LAMP } from "./layout";
import { SENSOR, sensorLampOn, sensorSwitchesOn } from "./entranceSensor";
import type { Vec3 } from "../toon/primitives";

const [lx, , lz] = ENTRANCE_LAMP.center;
const passer = (t: number): Vec3 => [lx - 6 + t, 0, lz + 1.5];

test("the entrance lamp's sensor switches on the first moment someone comes within its range, and stays on after they leave", () => {
  const on = sensorSwitchesOn(passer, SENSOR.range, 20);
  const [x, , z] = passer(on);
  expect(Math.hypot(x - lx, z - lz)).toBeLessThanOrEqual(SENSOR.range);
  expect(Math.hypot(passer(on - 0.1)[0] - lx, z - lz)).toBeGreaterThan(SENSOR.range);
  expect(sensorLampOn(passer, SENSOR.range, on - 0.05)).toBe(false);
  expect(sensorLampOn(passer, SENSOR.range, on)).toBe(true);
  expect(sensorLampOn(passer, SENSOR.range, 19)).toBe(true);
  expect(sensorSwitchesOn((): Vec3 => [lx + 20, 0, lz], SENSOR.range, 5)).toBe(Infinity);
});
