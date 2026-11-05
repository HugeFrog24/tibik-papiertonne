import type { Sphere } from "../physics/collision";
import { OUTLINE } from "../toon/primitives";
import { blanketGrid, type BedRect, type BlanketLie } from "./blanketShape";

export const blanketProblems = (bed: BedRect, body: readonly Sphere[], lie: BlanketLie) => {
  const grid = blanketGrid(bed, body, lie);
  const x0 = grid.columns[0];
  const x1 = grid.columns[grid.columns.length - 1];
  const z0 = grid.rows[0];
  const z1 = grid.rows[grid.rows.length - 1];
  const near = body.filter((s) => {
    const reach = s.radius + OUTLINE / 2;
    return s.center.x + reach > x0 && s.center.x - reach < x1 && s.center.z + reach > z0 && s.center.z - reach < z1;
  });
  const at = (i: number, j: number) => grid.height(grid.columns[i], grid.rows[j]);
  const problems = new Set<string>();
  const check = (x: number, z: number, h: number) => {
    const overMattress = x >= bed.x0 && x <= bed.x1 && z >= bed.z0 && z <= bed.z1;
    if (overMattress && h < bed.top + 0.001) problems.add(`into the mattress at ${x.toFixed(2)},${z.toFixed(2)}`);
    for (const s of near) {
      const reach = s.radius + OUTLINE / 2;
      const d = Math.hypot(x - s.center.x, z - s.center.z);
      if (d < reach && Math.abs(h - s.center.y) < Math.sqrt(reach * reach - d * d)) problems.add(`into his ${s.name} at ${x.toFixed(2)},${z.toFixed(2)}`);
    }
  };
  for (let i = 0; i < grid.columns.length; i++)
    for (let j = 0; j < grid.rows.length; j++) {
      check(grid.columns[i], grid.rows[j], at(i, j));
      if (i + 1 < grid.columns.length && j + 1 < grid.rows.length) {
        const x = (grid.columns[i] + grid.columns[i + 1]) / 2;
        const z = (grid.rows[j] + grid.rows[j + 1]) / 2;
        check(x, z, Math.min((at(i, j) + at(i + 1, j + 1)) / 2, (at(i + 1, j) + at(i, j + 1)) / 2));
      }
    }
  return [...problems];
};
