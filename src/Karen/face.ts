export type FacePoint = [number, number];

export const LIP_INK = { lift: 0.004, radius: 0.0075 };
export const BROW_INK = { lift: 0.004, radius: 0.0095 };

export const browLine = (side: 1 | -1, anger: number): FacePoint[] =>
  (
    [
      [0.024, 0.06 - 0.016 * anger],
      [0.064, 0.072 + 0.002 * anger],
      [0.104, 0.074 + 0.02 * anger],
    ] as FacePoint[]
  ).map(([x, y]) => [side * x, y]);

export const MOUTH = {
  y: -0.088,
  halfWidth: 0.071,
  widen: 0.05,
  rise: 0.009,
  sag: 0.03,
  sagPower: 2.2,
  curl: 0.02,
  drop: 0.078,
  dropPower: 0.7,
  minOpen: 0.03,
};
const SAMPLES = 25;

export const mouthHalfWidth = (open: number) =>
  MOUTH.halfWidth * (1 + MOUTH.widen * open);

export const mouthTop = (u: number, open: number) =>
  MOUTH.y +
  MOUTH.rise -
  MOUTH.sag * Math.abs(u) ** MOUTH.sagPower +
  MOUTH.curl * open * (1 - u * u);

export const mouthBottom = (u: number, open: number) =>
  mouthTop(u, open) -
  MOUTH.drop * open * Math.max(0, 1 - u * u) ** MOUTH.dropPower;

export const insideMouth = (x: number, y: number, open: number) => {
  if (open < MOUTH.minOpen) return false;
  const u = x / mouthHalfWidth(open);
  if (Math.abs(u) >= 1) return false;
  return y < mouthTop(u, open) && y > mouthBottom(u, open);
};

const glsl = (v: number) => v.toFixed(6);

export const MOUTH_HOLE_GLSL = `
bool insideMouth(vec2 p, float open) {
  if (open < ${glsl(MOUTH.minOpen)}) return false;
  float u = p.x / (${glsl(MOUTH.halfWidth)} * (1.0 + ${glsl(MOUTH.widen)} * open));
  if (abs(u) >= 1.0) return false;
  float top = ${glsl(MOUTH.y)} + ${glsl(MOUTH.rise)} - ${glsl(MOUTH.sag)} * pow(abs(u), ${glsl(MOUTH.sagPower)}) + ${glsl(MOUTH.curl)} * open * (1.0 - u * u);
  float bottom = top - ${glsl(MOUTH.drop)} * open * pow(max(0.0, 1.0 - u * u), ${glsl(MOUTH.dropPower)});
  return p.y < top && p.y > bottom;
}
`;

export const mouthShape = (open: number) => {
  const edge = (y: (u: number, open: number) => number) =>
    Array.from({ length: SAMPLES }, (_, i): FacePoint => {
      const u = -1 + (2 * i) / (SAMPLES - 1);
      return [u * mouthHalfWidth(open), y(u, open)];
    });
  return { top: edge(mouthTop), bottom: edge(mouthBottom) };
};
