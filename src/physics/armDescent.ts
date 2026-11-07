import type { ArmPose } from "../characters/skeleton";

export const ARM_LIMITS: Record<keyof ArmPose, readonly [number, number]> = {
  raise: [-0.6, 3.0],
  out: [-0.3, 1.9],
  elbow: [0, 2.4],
  inward: [-1.2, 1.6],
};

export const ARM_KEYS = Object.keys(ARM_LIMITS) as (keyof ArmPose)[];

export const blendArm = (a: ArmPose, b: ArmPose, w: number): ArmPose => ({
  raise: a.raise + (b.raise - a.raise) * w,
  out: a.out + (b.out - a.out) * w,
  elbow: a.elbow + (b.elbow - a.elbow) * w,
  inward: a.inward + (b.inward - a.inward) * w,
});

export const offsetArm = (arm: ArmPose, from: ArmPose, to: ArmPose, share: number): ArmPose =>
  Object.fromEntries(ARM_KEYS.map((key) => [key, arm[key] + share * (to[key] - from[key])])) as ArmPose;

export const armDistance = (a: ArmPose, b: ArmPose) => ARM_KEYS.reduce((sum, key) => sum + Math.abs(a[key] - b[key]), 0);

export const descendArm = (start: ArmPose, cost: (arm: ArmPose) => number) => {
  let arm = start;
  let best = cost(arm);
  for (let step = 0.3; step > 0.003; step /= 2) {
    for (let improved = true, rounds = 0; improved && rounds < 12; rounds++) {
      improved = false;
      for (const key of ARM_KEYS) {
        for (const dir of [1, -1]) {
          const [min, max] = ARM_LIMITS[key];
          const value = Math.min(max, Math.max(min, arm[key] + dir * step));
          const candidate = { ...arm, [key]: value };
          const score = cost(candidate);
          if (score < best - 1e-6) {
            arm = candidate;
            best = score;
            improved = true;
          }
        }
      }
    }
  }
  return { arm, best };
};

const sumSquares = (r: readonly number[]) => r.reduce((sum, v) => sum + v * v, 0);

export const clampArm = (arm: ArmPose): ArmPose =>
  Object.fromEntries(ARM_KEYS.map((key) => [key, Math.min(ARM_LIMITS[key][1], Math.max(ARM_LIMITS[key][0], arm[key]))])) as ArmPose;

const solveLinear = (matrix: readonly (readonly number[])[], rhs: readonly number[]) => {
  const rows = matrix.map((row, i) => [...row, rhs[i]]);
  const n = rhs.length;
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(rows[r][col]) > Math.abs(rows[pivot][col])) pivot = r;
    [rows[col], rows[pivot]] = [rows[pivot], rows[col]];
    for (let r = 0; r < n; r++) {
      if (r === col || rows[col][col] === 0) continue;
      const f = rows[r][col] / rows[col][col];
      for (let k = col; k <= n; k++) rows[r][k] -= f * rows[col][k];
    }
  }
  return rows.map((row, i) => (row[i] === 0 ? 0 : row[n] / row[i]));
};

export const TRACK = { iterations: 12, probe: 1e-4, damping: 1e-3, step: 0.1 };

const atLimit = (arm: ArmPose, key: keyof ArmPose, towards: number) =>
  (towards > 0 && arm[key] >= ARM_LIMITS[key][1] - 1e-9) || (towards < 0 && arm[key] <= ARM_LIMITS[key][0] + 1e-9);

const boundedStep = (arm: ArmPose, normal: readonly (readonly number[])[], gradient: readonly number[], damping: number) => {
  const pinned = ARM_KEYS.map(() => false);
  for (let round = 0; round <= ARM_KEYS.length; round++) {
    const free = (a: number, b: number, v: number) => (a === b ? v + damping * (1 + v) : v);
    const matrix = normal.map((row, a) => row.map((v, b) => (pinned[a] || pinned[b] ? Number(a === b) : free(a, b, v))));
    const raw = solveLinear(matrix, gradient.map((v, a) => (pinned[a] ? 0 : v)));
    const blocked = ARM_KEYS.findIndex((key, k) => !pinned[k] && atLimit(arm, key, raw[k]));
    if (blocked < 0) return raw;
    pinned[blocked] = true;
  }
  return ARM_KEYS.map(() => 0);
};

export const trackArm = (start: ArmPose, residuals: (arm: ArmPose) => readonly number[]): ArmPose => {
  let arm = clampArm(start);
  let r = residuals(arm);
  let cost = sumSquares(r);
  let damping = TRACK.damping;
  for (let i = 0; i < TRACK.iterations && cost > 1e-12; i++) {
    const columns = ARM_KEYS.map((key) => residuals({ ...arm, [key]: arm[key] + TRACK.probe }).map((v, j) => (v - r[j]) / TRACK.probe));
    const normal = columns.map((a) => columns.map((b) => a.reduce((sum, v, j) => sum + v * b[j], 0)));
    const gradient = columns.map((a) => -a.reduce((sum, v, j) => sum + v * r[j], 0));
    let stepped = false;
    for (let tries = 0; tries < 8 && !stepped; tries++) {
      const raw = boundedStep(arm, normal, gradient, damping);
      const longest = Math.max(...raw.map(Math.abs));
      const delta = longest > TRACK.step ? raw.map((v) => (v * TRACK.step) / longest) : raw;
      const candidate = clampArm(Object.fromEntries(ARM_KEYS.map((key, k) => [key, arm[key] + delta[k]])) as ArmPose);
      const rc = residuals(candidate);
      const cc = sumSquares(rc);
      if (cc < cost) {
        [arm, r, cost, damping, stepped] = [candidate, rc, cc, Math.max(1e-7, damping / 3), true];
      } else damping *= 10;
    }
    if (!stepped) break;
  }
  return arm;
};

export const PUSH = { beyond: 1e-4, anchor: 0.01 };

export const pushClear = (start: ArmPose, depths: (arm: ArmPose) => readonly number[]): ArmPose =>
  trackArm(start, (arm) => [
    ...depths(arm).map((d) => (d > 0 ? d + PUSH.beyond : 0)),
    ...ARM_KEYS.map((key) => PUSH.anchor * (arm[key] - start[key])),
  ]);
