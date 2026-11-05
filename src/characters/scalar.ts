export const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

export const smoothstep = (k: number) => k * k * (3 - 2 * k);

export const easeUnit = (k: number) => smoothstep(clamp(k, 0, 1));

export const inWindow = (t: number, [a, b]: readonly [number, number]) =>
  easeUnit((t - a) / (b - a));

export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;

export const lerpVec3 = (
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  k: number,
): [number, number, number] => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

export const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

export const round6 = (v: number) => Math.round(v * 1e6) / 1e6;
