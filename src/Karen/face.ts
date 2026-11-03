export type FacePoint = [number, number];

const MOUTH_Y = -0.088;
const MOUTH_HALF_WIDTH = 0.071;
const SAMPLES = 25;

export const LIP_INK = { lift: 0.004, radius: 0.0075 };

export const mouthShape = (open: number) => {
  const x = (u: number) => u * MOUTH_HALF_WIDTH * (1 + 0.05 * open);
  const top = (u: number) => MOUTH_Y + 0.009 - 0.03 * Math.abs(u) ** 2.2 + 0.03 * open * (1 - u * u);
  const depth = (u: number) => 0.068 * open * Math.max(0, 1 - u * u) ** 0.7;
  const bottom = (u: number) => top(u) - depth(u);
  const edge = (reach: number, y: (u: number) => number) =>
    Array.from({ length: SAMPLES }, (_, i): FacePoint => {
      const u = reach * (-1 + (2 * i) / (SAMPLES - 1));
      return [x(u), y(u)];
    });
  return {
    top: edge(1, top),
    bottom: edge(1, bottom),
    teethTop: edge(0.72, top),
    teethBottom: edge(0.72, (u) => top(u) - Math.min(0.013, 0.4 * depth(u))),
    tongueTop: edge(0.55, (u) => bottom(u) + 0.32 * depth(u) * Math.sqrt(Math.max(0, 1 - (u / 0.55) ** 2))),
    tongueBottom: edge(0.55, bottom),
  };
};
