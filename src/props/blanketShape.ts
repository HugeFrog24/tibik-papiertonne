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

const foldAt = (bed: BedRect, aside: number) => bed.z0 + clamp(aside, 0, bed.z1 - bed.z0);

const underneath = (bed: BedRect, body: readonly Sphere[], edge: number, fold: number) =>
  body.filter((s) => {
    const reach = s.radius + BLANKET.clearance;
    return (
      s.center.x + reach >= edge &&
      s.center.z + reach >= fold &&
      s.center.x - reach <= bed.x1 + BLANKET.hang &&
      s.center.z - reach <= bed.z1 + BLANKET.hang
    );
  });

const overhang = (bed: BedRect, x: number, z: number) =>
  (Math.max(0, bed.z0 - z, z - bed.z1, x - bed.x1) / BLANKET.hang) * BLANKET.drop;

const doubled = (bed: BedRect, aside: number) => {
  const fold = foldAt(bed, aside);
  return (z: number) => (aside > 0 && z >= fold && z <= fold + aside ? BLANKET.ply : 0);
};

export type BlanketLie = { readonly cover: number; readonly aside?: number; readonly edge?: number };

const laid = (bed: BedRect, body: readonly Sphere[], { cover, aside = 0, edge = blanketEdge(bed, body, cover) }: BlanketLie) => ({ cover, aside, edge });

export const blanketSurface = (bed: BedRect, body: readonly Sphere[], lie: BlanketLie) => {
  const { cover, aside, edge } = laid(bed, body, lie);
  const base = bed.top + BLANKET.ply;
  const folded = (1 - clamp(cover, 0, 1)) * (BLANKET.layers - 1) * BLANKET.ply;
  const under = underneath(bed, body, edge, foldAt(bed, aside));
  const flap = doubled(bed, aside);
  return (x: number, z: number) => Math.max(base + folded - overhang(bed, x, z), over(under, x, z, base) + folded) + flap(z);
};

export const blanketGrid = (bed: BedRect, body: readonly Sphere[], lie: BlanketLie) => {
  const { cover, aside, edge } = laid(bed, body, lie);
  const along = Math.max(2, Math.ceil((bed.x1 - edge) / BLANKET.step));
  const dx = (bed.x1 - edge) / along;
  const foot = Math.max(1, Math.round(BLANKET.hang / dx));
  const fold = foldAt(bed, aside);
  const across = aside > 0 ? Math.max(2, Math.round(((bed.z1 - fold) / (bed.z1 - bed.z0)) * BLANKET.across)) : BLANKET.across;
  const dz = (bed.z1 - (aside > 0 ? fold : bed.z0)) / across;
  const side = Math.max(1, Math.round(BLANKET.hang / dz));
  const columns = Array.from({ length: along + foot + 1 }, (_, i) => edge + i * dx);
  const rows =
    aside > 0
      ? Array.from({ length: across + side + 1 }, (_, j) => fold + j * dz)
      : Array.from({ length: BLANKET.across + 2 * side + 1 }, (_, j) => bed.z0 + (j - side) * dz);
  const surface = blanketSurface(bed, body, { cover, aside, edge });
  const hem = bed.top + BLANKET.hem;
  const under = underneath(bed, body, edge, fold);
  const height = (x: number, z: number) =>
    x < edge + dx / 2 || (aside > 0 && z < fold + dz / 2) ? Math.max(hem - overhang(bed, x, z), over(under, x, z, hem)) : surface(x, z);
  return { columns, rows, dx, dz, height };
};
