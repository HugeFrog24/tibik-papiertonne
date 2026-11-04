export const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

export const smoothstep = (k: number) => k * k * (3 - 2 * k);

export const easeUnit = (k: number) => smoothstep(clamp(k, 0, 1));

export const inWindow = (t: number, [a, b]: readonly [number, number]) =>
  easeUnit((t - a) / (b - a));

export const round6 = (v: number) => Math.round(v * 1e6) / 1e6;
