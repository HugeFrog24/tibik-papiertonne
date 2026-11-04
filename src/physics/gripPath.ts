export type Point2 = readonly [number, number];

const awayFrom = (edge: Point2, other: Point2): [number, number] => {
  const length = Math.hypot(edge[0], edge[1]);
  const n: [number, number] = [-edge[1] / length, edge[0] / length];
  return n[0] * other[0] + n[1] * other[1] > 0 ? [-n[0], -n[1]] : n;
};

export const aroundCorner = (
  start: Point2,
  corner: Point2,
  end: Point2,
  gap: number,
) => {
  const first: Point2 = [corner[0] - start[0], corner[1] - start[1]];
  const second: Point2 = [end[0] - corner[0], end[1] - corner[1]];
  const n1 = awayFrom(first, second);
  const n2 = awayFrom(second, [start[0] - corner[0], start[1] - corner[1]]);
  const from = Math.atan2(n1[1], n1[0]);
  const sweep =
    ((Math.atan2(n2[1], n2[0]) - from + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
  const along = Math.hypot(...first);
  const turn = Math.abs(sweep) * gap;
  const total = along + turn + Math.hypot(...second);
  return (u: number): [number, number] => {
    let s = Math.min(1, Math.max(0, u)) * total;
    if (s <= along) {
      const k = s / along;
      return [start[0] + first[0] * k + n1[0] * gap, start[1] + first[1] * k + n1[1] * gap];
    }
    s -= along;
    if (s <= turn) {
      const a = from + (sweep * s) / turn;
      return [corner[0] + gap * Math.cos(a), corner[1] + gap * Math.sin(a)];
    }
    const k = (s - turn) / (total - along - turn);
    return [corner[0] + second[0] * k + n2[0] * gap, corner[1] + second[1] * k + n2[1] * gap];
  };
};
