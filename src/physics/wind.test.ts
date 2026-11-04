import { expect, test } from "vitest";
import { Vector3 } from "three";
import { WIND, breeze, swayOf, windIn, type Spring } from "./wind";

const simulated = (
  spring: Spring,
  until: number,
  from = -60,
  step = 1 / 600,
) => {
  const natural = 2 * Math.PI * spring.hertz;
  const accel = (t: number, x: number, v: number) =>
    natural * natural * (breeze(t) - x) - 2 * spring.damping * natural * v;
  let [t, x, v] = [from, breeze(from), 0];
  while (t < until - 1e-12) {
    const h = Math.min(step, until - t);
    const k1x = v;
    const k1v = accel(t, x, v);
    const k2x = v + (h / 2) * k1v;
    const k2v = accel(t + h / 2, x + (h / 2) * k1x, v + (h / 2) * k1v);
    const k3x = v + (h / 2) * k2v;
    const k3v = accel(t + h / 2, x + (h / 2) * k2x, v + (h / 2) * k2v);
    const k4x = v + h * k3v;
    const k4v = accel(t + h, x + h * k3x, v + h * k3v);
    x += (h / 6) * (k1x + 2 * k2x + 2 * k3x + k4x);
    v += (h / 6) * (k1v + 2 * k2v + 2 * k3v + k4v);
    t += h;
  }
  return x;
};

test("the breeze is a light, steady wind with gusts: always blowing, never reversing", () => {
  const samples = Array.from({ length: 30 * 60 }, (_, i) => breeze(i / 30));
  expect(Math.min(...samples)).toBeGreaterThan(0);
  expect(Math.max(...samples)).toBeLessThanOrEqual(1);
  expect(WIND.direction.y).toBe(0);
});

test.each([
  { hertz: 2.5, damping: 0.3 },
  { hertz: 1.3, damping: 0.25 },
  { hertz: 0.35, damping: 0.3 },
])(
  "sway is exactly what a damped spring driven by the breeze settles into (%o)",
  (spring) => {
    for (const t of [0, 1.7, 4.2, 9.9]) {
      expect(swayOf(t, spring)).toBeCloseTo(simulated(spring, t), 4);
    }
  },
);

test.each([0, Math.PI, 0.7, -1.3])(
  "things in a frame turned by %f still lean with the breeze, not against it",
  (yaw) => {
    const world = windIn(yaw).applyAxisAngle(new Vector3(0, 1, 0), yaw);
    expect(world.x).toBeCloseTo(WIND.direction.x, 12);
    expect(world.z).toBeCloseTo(WIND.direction.z, 12);
  },
);
