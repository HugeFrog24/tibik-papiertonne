import { distanceToSegment, type Point2 } from "../characters/scalar";
import { seeded } from "../physics/seeded";

export const GLASS_RAIN = {
  seed: 1312,
  beads: 30000,
  tries: 90000,
  radius: [0.0005, 0.0025] as const,
  apart: 0.0004,
  runs: 3,
  runWidth: 0.0015,
  runStep: 0.008,
  wander: 0.004,
  runEnd: 0.0035,
  seal: 0.003,
};

export const BEAD_RIM = [1.15 * Math.PI, 1.85 * Math.PI] as const;

export type Bead = { readonly x: number; readonly y: number; readonly r: number };
export type Run = { readonly path: readonly Point2[]; readonly width: number; readonly end: Bead };
export type GlassRain = { readonly beads: readonly Bead[]; readonly runs: readonly Run[]; readonly seal: number };

const between = (random: () => number, a: number, b: number) => a + (b - a) * random();

const runDown = (random: () => number, pane: { w: number; h: number }, lane: number): Run => {
  const margin = 0.06;
  const laneWidth = (pane.w - 2 * margin) / GLASS_RAIN.runs;
  const x0 = -pane.w / 2 + margin + laneWidth * (lane + between(random, 0.3, 0.7));
  const top = between(random, pane.h * 0.05, pane.h * 0.4);
  const bottom = between(random, -pane.h * 0.42, -pane.h * 0.15);
  const steps = Math.floor((top - bottom) / GLASS_RAIN.runStep);
  const path: Point2[] = [];
  let x = x0;
  for (let i = 0; i <= steps; i++) {
    path.push([x, top - i * GLASS_RAIN.runStep]);
    x = Math.min(x0 + 0.03, Math.max(x0 - 0.03, x + between(random, -GLASS_RAIN.wander, GLASS_RAIN.wander)));
  }
  const [ex, ey] = path[path.length - 1];
  return { path, width: GLASS_RAIN.runWidth, end: { x: ex, y: ey, r: GLASS_RAIN.runEnd } };
};

const CELL = 2 * GLASS_RAIN.radius[1] + GLASS_RAIN.apart;

const beadGrid = () => {
  const cells = new Map<string, Bead[]>();
  const key = (i: number, j: number) => `${i},${j}`;
  return {
    add: (b: Bead) => {
      const k = key(Math.floor(b.x / CELL), Math.floor(b.y / CELL));
      cells.set(k, [...(cells.get(k) ?? []), b]);
    },
    near: (b: Bead) => {
      const [i, j] = [Math.floor(b.x / CELL), Math.floor(b.y / CELL)];
      return [-1, 0, 1].flatMap((di) => [-1, 0, 1].flatMap((dj) => cells.get(key(i + di, j + dj)) ?? []));
    },
  };
};

const offTheRun = (bead: Bead, run: Run) => {
  const [, top] = run.path[0];
  const nearest = Math.round((top - bead.y) / GLASS_RAIN.runStep);
  const reach = Math.ceil((bead.r + run.width) / GLASS_RAIN.runStep) + 1;
  return (
    Math.hypot(run.end.x - bead.x, run.end.y - bead.y) >= run.end.r + bead.r + GLASS_RAIN.apart &&
    run.path
      .slice(Math.max(0, nearest - reach), Math.max(0, nearest + reach + 1))
      .every((to, i, near) => i === 0 || distanceToSegment([bead.x, bead.y], near[i - 1], to) >= bead.r + run.width)
  );
};

export const glassRain = (pane: { readonly w: number; readonly h: number }): GlassRain => {
  const random = seeded(GLASS_RAIN.seed);
  const runs = Array.from({ length: GLASS_RAIN.runs }, (_, lane) => runDown(random, pane, lane));
  const beads: Bead[] = [];
  const grid = beadGrid();
  const [least, most] = GLASS_RAIN.radius;
  for (let i = 0; i < GLASS_RAIN.tries && beads.length < GLASS_RAIN.beads; i++) {
    const y = between(random, -pane.h / 2, pane.h / 2);
    const down = (pane.h / 2 - y) / pane.h;
    const r = least + (most - least) * random() * (0.4 + 0.6 * down);
    const bead = { x: between(random, -pane.w / 2 + r, pane.w / 2 - r), y: Math.max(-pane.h / 2 + r, Math.min(pane.h / 2 - r, y)), r };
    if (grid.near(bead).every((b) => Math.hypot(b.x - bead.x, b.y - bead.y) >= b.r + bead.r + GLASS_RAIN.apart) && runs.every((run) => offTheRun(bead, run))) {
      beads.push(bead);
      grid.add(bead);
    }
  }
  return { beads, runs, seal: GLASS_RAIN.seal };
};
