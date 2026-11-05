import { clamp, lerp } from "../characters/scalar";
import type { Sphere } from "../physics/collision";

export type BedRect = { readonly x0: number; readonly x1: number; readonly z0: number; readonly z1: number; readonly top: number };

export const BLANKET = {
  color: "#3b3f45",
  ply: 0.008,
  clearance: 0.015,
  fold: 0.4,
  layers: 4,
  chest: 0.3,
  hang: 0.06,
  drop: 0.12,
  step: 0.02,
  across: 100,
  hem: 0.002,
};

const mean = (values: readonly number[]) => values.reduce((a, b) => a + b, 0) / values.length;

const chestX = (bed: BedRect, body: readonly Sphere[]) => {
  const head = body.filter((s) => s.name === "head");
  const feet = body.filter((s) => s.name.endsWith("foot"));
  if (head.length === 0 || feet.length === 0) return (bed.x0 + bed.x1) / 2;
  return lerp(mean(head.map((s) => s.center.x)), mean(feet.map((s) => s.center.x)), BLANKET.chest);
};

export const blanketEdge = (bed: BedRect, body: readonly Sphere[], cover: number) =>
  lerp(bed.x1 - BLANKET.fold, chestX(bed, body), clamp(cover, 0, 1));

const FALL = (70 * Math.PI) / 180;

const over = (body: readonly Sphere[], x: number, z: number, base: number) => {
  let h = -Infinity;
  for (const s of body) {
    const reach = s.radius + BLANKET.clearance;
    const leaves = reach * Math.sin(FALL);
    const d = Math.hypot(x - s.center.x, z - s.center.z);
    const lift = s.center.y + reach * Math.cos(FALL) - base;
    if (lift <= 0) continue;
    const runout = (2 * lift) / Math.tan(FALL);
    const tent =
      d <= leaves
        ? s.center.y + Math.sqrt(reach * reach - d * d)
        : d < leaves + runout
          ? base + lift * (1 - (d - leaves) / runout) ** 2
          : -Infinity;
    h = Math.max(h, tent);
  }
  return h;
};

const underneath = (body: readonly Sphere[], edge: number) => body.filter((s) => s.center.x + s.radius >= edge);

const overhang = (bed: BedRect, x: number, z: number) =>
  (Math.max(0, bed.z0 - z, z - bed.z1, x - bed.x1) / BLANKET.hang) * BLANKET.drop;

export const blanketSurface = (bed: BedRect, body: readonly Sphere[], cover: number) => {
  const base = bed.top + BLANKET.ply;
  const folded = (1 - clamp(cover, 0, 1)) * (BLANKET.layers - 1) * BLANKET.ply;
  const under = underneath(body, blanketEdge(bed, body, cover));
  return (x: number, z: number) => Math.max(base + folded - overhang(bed, x, z), over(under, x, z, base) + folded);
};

export const blanketGrid = (bed: BedRect, body: readonly Sphere[], cover: number) => {
  const edge = blanketEdge(bed, body, cover);
  const along = Math.max(2, Math.ceil((bed.x1 - edge) / BLANKET.step));
  const dx = (bed.x1 - edge) / along;
  const foot = Math.max(1, Math.round(BLANKET.hang / dx));
  const dz = (bed.z1 - bed.z0) / BLANKET.across;
  const side = Math.max(1, Math.round(BLANKET.hang / dz));
  const columns = Array.from({ length: along + foot + 2 }, (_, i) => edge + (i - 1) * dx);
  const rows = Array.from({ length: BLANKET.across + 2 * side + 1 }, (_, j) => bed.z0 + (j - side) * dz);
  const surface = blanketSurface(bed, body, cover);
  const hem = bed.top + BLANKET.hem;
  const height = (x: number, z: number) =>
    x < edge - dx / 2 ? Math.max(hem - overhang(bed, x, z), over(underneath(body, edge), x, z, hem)) : surface(x, z);
  return { columns, rows, dx, dz, height };
};
