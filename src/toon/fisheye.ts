import type { Point2 } from "../characters/scalar";
import { FINEST_PIXEL_RATIO, FORMATS, type Format } from "../frameRate";

export type { Point2 };

const RAISE: Readonly<Record<Format, number>> = { wide: 0, tall: 0.067 };

export const FISHEYE = { halfAngle: (80 * Math.PI) / 180, vignette: 0.12, supersample: 2, raise: RAISE };

export const barrel = ([x, y]: Point2, halfAngle: number): [number, number] => {
  const r = Math.hypot(x, y);
  const k = r === 0 ? halfAngle / Math.tan(halfAngle) : Math.tan(Math.min(r, 1) * halfAngle) / (r * Math.tan(halfAngle));
  return [x * k, y * k];
};

export const COLOUR_SAMPLES = 4;

const MULTISAMPLED_UP_TO = FORMATS.wide.width * FORMATS.wide.height * FINEST_PIXEL_RATIO ** 2;

export const colourSamples = ([width, height]: readonly [number, number]) => (width * height <= MULTISAMPLED_UP_TO ? COLOUR_SAMPLES : 0);

export const insideLens = ([x, y]: Point2) => x * x + y * y <= 1;

export const canvasPixels = (
  width: number,
  height: number,
  pixelRatio: number,
  fisheye = false,
  largest = Infinity,
): [number, number] => {
  const scale = Math.min(pixelRatio * (fisheye ? FISHEYE.supersample : 1), largest / Math.max(width, height));
  return [Math.round(width * scale), Math.round(height * scale)];
};

const shorterSide = (aspect: number) => Math.min(aspect, 1);

export const acrossTheShorterSide = (fov: number, aspect: number) =>
  aspect >= 1 ? fov : (2 * Math.atan(Math.tan((fov * Math.PI) / 360) / aspect) * 180) / Math.PI;

export const lensPoint = ([u, v]: Point2, aspect: number, raise = 0): [number, number] => [
  ((u * 2 - 1) * aspect) / shorterSide(aspect),
  (v * 2 - 1) / shorterSide(aspect) - raise,
];

const backToUv = ([x, y]: Point2, aspect: number, raise = 0): [number, number] => [
  ((x * shorterSide(aspect)) / aspect) * 0.5 + 0.5,
  (y + raise) * shorterSide(aspect) * 0.5 + 0.5,
];

export const distortUv = (uv: Point2, aspect: number, halfAngle: number, raise = 0) => backToUv(barrel(lensPoint(uv, aspect, raise), halfAngle), aspect);

export const unbarrel = (
  [x, y]: Point2,
  halfAngle: number,
): [number, number] => {
  const s = Math.hypot(x, y);
  if (s === 0) return [0, 0];
  const scale = Math.atan(s * Math.tan(halfAngle)) / halfAngle / s;
  return [x * scale, y * scale];
};

export const undistortUv = (uv: Point2, aspect: number, halfAngle: number, raise = 0) => backToUv(unbarrel(lensPoint(uv, aspect), halfAngle), aspect, raise);
