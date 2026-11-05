import { clamp, lerp } from "../characters/scalar";

export type BedRect = { readonly x0: number; readonly x1: number; readonly z0: number; readonly z1: number; readonly top: number };
type Ball = { readonly name: string; readonly center: { readonly x: number; readonly y: number; readonly z: number }; readonly radius: number };

export const BLANKET = { color: "#3b3f45", ply: 0.008, clearance: 0.012, fold: 0.4, layers: 4, drape: 0.22, chest: 0.3, hang: 0.06, drop: 0.12 };

const mean = (values: readonly number[]) => values.reduce((a, b) => a + b, 0) / values.length;

const chestX = (bed: BedRect, body: readonly Ball[]) => {
  const head = body.filter((s) => s.name === "head");
  const feet = body.filter((s) => s.name.endsWith("foot"));
  if (head.length === 0 || feet.length === 0) return (bed.x0 + bed.x1) / 2;
  const hx = mean(head.map((s) => s.center.x));
  return lerp(hx, mean(feet.map((s) => s.center.x)), BLANKET.chest);
};

export const blanketEdge = (bed: BedRect, body: readonly Ball[], cover: number) =>
  lerp(bed.x1 - BLANKET.fold, chestX(bed, body), clamp(cover, 0, 1));

export const blanketSurface = (bed: BedRect, body: readonly Ball[], cover: number) => {
  const base = bed.top + BLANKET.ply;
  const folded = (1 - clamp(cover, 0, 1)) * (BLANKET.layers - 1) * BLANKET.ply;
  return (x: number, z: number) => {
    let h = base;
    for (const s of body) {
      const reach = s.radius + BLANKET.clearance;
      const d = Math.hypot(x - s.center.x, z - s.center.z);
      const over =
        d < reach
          ? s.center.y + Math.sqrt(reach * reach - d * d)
          : base + Math.max(0, s.center.y - base) * Math.max(0, 1 - (d - reach) / BLANKET.drape) ** 2;
      h = Math.max(h, over);
    }
    const outside = Math.max(0, bed.z0 - z, z - bed.z1);
    return h + folded - (outside / BLANKET.hang) * BLANKET.drop;
  };
};
