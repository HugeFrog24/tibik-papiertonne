export type SolePoint = {
  readonly u: number;
  readonly v: number;
  readonly drop: number;
};

export const soleGrid = ([rx, ry, rz]: readonly [
  number,
  number,
  number,
]): SolePoint[] => {
  const points: SolePoint[] = [];
  for (let i = 0; i <= 20; i++)
    for (let j = -5; j <= 5; j++) {
      const u = -rz + (2 * rz * i) / 20;
      const v = (rx * j) / 5.5;
      const inside = 1 - (u / rz) ** 2 - (v / rx) ** 2;
      if (inside <= 0) continue;
      points.push({ u, v, drop: ry * Math.sqrt(inside) });
    }
  return points;
};
