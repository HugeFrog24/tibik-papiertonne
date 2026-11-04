import { Vector3 } from "three";

export type Spring = { readonly hertz: number; readonly damping: number };

export const WIND = {
  direction: new Vector3(1, 0, -0.25).normalize(),
  mean: 0.5,
  gusts: [
    { amplitude: 0.22, period: 6.8, phase: 0.4 },
    { amplitude: 0.14, period: 3.1, phase: 2.1 },
    { amplitude: 0.08, period: 1.7, phase: 4.0 },
    { amplitude: 0.05, period: 1.05, phase: 5.3 },
  ],
} as const;

export const windIn = (yaw: number) => {
  const [c, s] = [Math.cos(yaw), Math.sin(yaw)];
  return new Vector3(
    WIND.direction.x * c - WIND.direction.z * s,
    0,
    WIND.direction.x * s + WIND.direction.z * c,
  );
};

export const breeze = (t: number) =>
  WIND.gusts.reduce<number>(
    (sum, g) =>
      sum + g.amplitude * Math.sin((2 * Math.PI * t) / g.period + g.phase),
    WIND.mean,
  );

export const swayOf = (t: number, { hertz, damping }: Spring) => {
  const natural = 2 * Math.PI * hertz;
  return WIND.gusts.reduce<number>((sum, g) => {
    const w = (2 * Math.PI) / g.period;
    const real = natural * natural - w * w;
    const imaginary = 2 * damping * natural * w;
    const gain = (natural * natural) / Math.hypot(real, imaginary);
    return (
      sum +
      g.amplitude *
        gain *
        Math.sin(w * t + g.phase - Math.atan2(imaginary, real))
    );
  }, WIND.mean);
};
