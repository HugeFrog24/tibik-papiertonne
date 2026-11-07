export type Point2 = readonly [number, number];

export const FISHEYE = { strength: 0.35, vignette: 0.12 };

export const barrel = ([x, y]: Point2, strength: number): [number, number] => {
  const k = 1 - strength * (1 - (x * x + y * y));
  return [x * k, y * k];
};

export const insideLens = ([x, y]: Point2) => x * x + y * y <= 1;

export const canvasPixels = (
  width: number,
  height: number,
  pixelRatio: number,
): [number, number] => [
  Math.round(width * pixelRatio),
  Math.round(height * pixelRatio),
];

export const lensPoint = ([u, v]: Point2, aspect: number): [number, number] => [
  (u * 2 - 1) * aspect,
  v * 2 - 1,
];

export const distortUv = (
  uv: Point2,
  aspect: number,
  strength: number,
): [number, number] => {
  const [x, y] = barrel(lensPoint(uv, aspect), strength);
  return [(x / aspect) * 0.5 + 0.5, y * 0.5 + 0.5];
};

export const unbarrel = (
  [x, y]: Point2,
  strength: number,
): [number, number] => {
  const target = Math.hypot(x, y);
  if (target === 0) return [0, 0];
  const radial = (r: number) => r * (1 - strength * (1 - r * r));
  let low = 0;
  let high = Math.max(1, target / (1 - strength));
  for (let i = 0; i < 80; i++) {
    const mid = (low + high) / 2;
    if (radial(mid) < target) low = mid;
    else high = mid;
  }
  const scale = (low + high) / 2 / target;
  return [x * scale, y * scale];
};

export const undistortUv = (
  uv: Point2,
  aspect: number,
  strength: number,
): [number, number] => {
  const [x, y] = unbarrel(lensPoint(uv, aspect), strength);
  return [(x / aspect) * 0.5 + 0.5, y * 0.5 + 0.5];
};
