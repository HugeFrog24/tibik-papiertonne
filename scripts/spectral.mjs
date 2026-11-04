import { RATE } from "./sfx-audio.mjs";

const HOP = 320;
const SIZE = 8192;
const BIN = RATE / SIZE;
const lobeOf = (window) => Math.round((2 * SIZE) / window);
export const COO = {
  pitch: [300, 800],
  partials: 8,
  harmonicSum: false,
  window: 1024,
};
export const BUZZ = {
  pitch: [120, 400],
  partials: 16,
  harmonicSum: true,
  window: 4096,
};
export const LOBE_WIDTH = lobeOf(COO.window) * BIN;
export const BANDS = [
  [100, 300],
  [300, 700],
  [700, 1500],
  [1500, 3000],
  [3000, 6000],
  [6000, 12000],
];
const SYLLABLE = {
  below: 35,
  above: 8,
  bridge: 3,
  shortest: 6,
  steady: 15,
  floor: 0.1,
};
const POINTS = 16;
export const MODULATION = [
  [5, 10],
  [10, 20],
  [20, 40],
  [40, 80],
  [80, 160],
];
const TEXTURE = {
  follow: 250,
  rate: 1000,
  smooth: 20,
  trim: 20,
  dip: -0.5,
  size: 2048,
};
const FLOOR = -90;

export const fft = (re, im) => {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let length = 2; length <= n; length <<= 1) {
    const angle = (-2 * Math.PI) / length;
    const half = length / 2;
    for (let i = 0; i < n; i += length) {
      for (let k = 0; k < half; k++) {
        const c = Math.cos(angle * k);
        const s = Math.sin(angle * k);
        const a = i + k;
        const b = a + half;
        const xr = re[b] * c - im[b] * s;
        const xi = re[b] * s + im[b] * c;
        re[b] = re[a] - xr;
        im[b] = im[a] - xi;
        re[a] += xr;
        im[a] += xi;
      }
    }
  }
};

const spectrumAt = (samples, from, window) => {
  const re = new Float64Array(SIZE);
  const im = new Float64Array(SIZE);
  for (let i = 0; i < window; i++) {
    re[i] =
      samples[from + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / window));
  }
  fft(re, im);
  return Float64Array.from(
    { length: SIZE / 2 },
    (_, k) => re[k] * re[k] + im[k] * im[k],
  );
};

const strongestIn = (power, lo, hi) => {
  let best = lo;
  for (let k = lo; k <= hi; k++) if (power[k] > power[best]) best = k;
  const [a, b, c] = [power[best - 1], power[best], power[best + 1]].map((p) =>
    Math.log(p + 1e-30),
  );
  const shift = a - 2 * b + c === 0 ? 0 : (0.5 * (a - c)) / (a - 2 * b + c);
  return (best + shift) * BIN;
};

const lobePower = (power, f, lobe) => {
  const centre = Math.round(f / BIN);
  let sum = 0;
  for (
    let k = Math.max(1, centre - lobe);
    k <= Math.min(power.length - 1, centre + lobe);
    k++
  )
    sum += power[k];
  return sum;
};

const harmonicScore = (power, kind, k) => {
  let score = 0;
  for (let m = 1; m <= kind.partials && m * k < power.length - 3; m++) {
    let peak = 0;
    for (let j = m * k - 2; j <= m * k + 2; j++)
      peak = Math.max(peak, power[j]);
    score += Math.log(peak + 1e-30);
  }
  return score;
};

const harmonicPitch = (power, kind) => {
  const lo = Math.round(kind.pitch[0] / BIN);
  const hi = Math.round(kind.pitch[1] / BIN);
  let pick = lo;
  for (let k = lo; k <= hi; k++)
    if (harmonicScore(power, kind, k) > harmonicScore(power, kind, pick))
      pick = k;
  const [a, b, c] = [pick - 1, pick, pick + 1].map((k) =>
    harmonicScore(power, kind, k),
  );
  const curve = a - 2 * b + c;
  const shift =
    curve < 0 ? Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / curve)) : 0;
  return (pick + shift) * BIN;
};

export const analyse = (samples, kind = COO) => {
  const frames = [];
  const lobe = lobeOf(kind.window);
  for (let from = 0; from + kind.window <= samples.length; from += HOP) {
    let energy = 0;
    for (let i = 0; i < kind.window; i++) energy += samples[from + i] ** 2;
    const power = spectrumAt(samples, from, kind.window);
    const f0 = kind.harmonicSum
      ? harmonicPitch(power, kind)
      : strongestIn(
          power,
          Math.round(kind.pitch[0] / BIN),
          Math.round(kind.pitch[1] / BIN),
        );
    const partialAt = Array.from({ length: kind.partials }, (_, m) => {
      const near = (m + 1) * f0;
      const spread = Math.max(2, Math.round((0.03 * near) / BIN));
      const k = Math.round(near / BIN);
      return m === 0
        ? f0
        : strongestIn(
            power,
            k - spread,
            Math.min(power.length - 2, k + spread),
          );
    }).filter((f) => f < RATE / 2 - lobe * BIN);
    const partials = partialAt.map((f) => lobePower(power, f, lobe));
    const taken = new Uint8Array(power.length);
    for (const f of partialAt) {
      const centre = Math.round(f / BIN);
      for (
        let k = Math.max(0, centre - lobe);
        k <= Math.min(power.length - 1, centre + lobe);
        k++
      )
        taken[k] = 1;
    }
    const residual = BANDS.map(([lo, hi]) => {
      let sum = 0;
      for (
        let k = Math.round(lo / BIN);
        k <= Math.min(power.length - 1, Math.round(hi / BIN));
        k++
      )
        if (!taken[k]) sum += power[k];
      return sum;
    });
    frames.push({
      at: (from + kind.window / 2) / RATE,
      level: 10 * Math.log10(energy / kind.window + 1e-12),
      f0,
      partials,
      residual,
    });
  }
  return frames;
};

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

const decibels = (ratio) => Math.max(FLOOR, 10 * Math.log10(ratio + 1e-30));

const resample = (values, count) =>
  Array.from({ length: count }, (_, i) => {
    const x = (i / (count - 1)) * (values.length - 1);
    const a = Math.floor(x);
    const b = Math.min(values.length - 1, a + 1);
    return values[a] + (values[b] - values[a]) * (x - a);
  });

export const round = (v, digits = 3) => Number(v.toFixed(digits));

export const textureOf = (samples, from, to) => {
  const a = 1 - Math.exp((-2 * Math.PI * TEXTURE.follow) / RATE);
  const step = Math.round(RATE / TEXTURE.rate);
  let y1 = 0;
  let y2 = 0;
  const fine = [];
  for (let i = Math.max(0, from - step * TEXTURE.trim); i < to; i++) {
    y1 += a * (Math.abs(samples[i]) - y1);
    y2 += a * (y1 - y2);
    if (i >= from && (i - from) % step === 0) fine.push(y2);
  }
  const smooth = fine.map((_, i) => {
    const near = fine.slice(
      Math.max(0, i - TEXTURE.smooth),
      i + TEXTURE.smooth,
    );
    return near.reduce((sum, v) => sum + v, 0) / near.length;
  });
  const flutter = fine
    .map((v, i) => v / smooth[i] - 1)
    .slice(TEXTURE.trim, -TEXTURE.trim);
  if (flutter.length < 2 * TEXTURE.smooth)
    return { modulation: MODULATION.map(() => 0), dips: 0, dip: 0 };
  const re = new Float64Array(TEXTURE.size);
  const im = new Float64Array(TEXTURE.size);
  let weight = 0;
  flutter.slice(0, TEXTURE.size).forEach((m, i) => {
    const w =
      0.5 -
      0.5 *
        Math.cos((2 * Math.PI * i) / Math.min(TEXTURE.size, flutter.length));
    re[i] = m * w;
    weight += w * w;
  });
  fft(re, im);
  const modulation = MODULATION.map(([lo, hi]) => {
    let sum = 0;
    for (
      let k = Math.round((lo * TEXTURE.size) / TEXTURE.rate);
      k < Math.round((hi * TEXTURE.size) / TEXTURE.rate);
      k++
    )
      sum += re[k] ** 2 + im[k] ** 2;
    return Math.sqrt((2 * sum) / TEXTURE.size / weight);
  });
  const dips = [];
  let start = -1;
  flutter.forEach((m, i) => {
    if (m < TEXTURE.dip && start < 0) start = i;
    if (m >= TEXTURE.dip && start >= 0) {
      dips.push(i - start);
      start = -1;
    }
  });
  return {
    modulation: modulation.map((v) => round(v)),
    dips: round(dips.length / (flutter.length / TEXTURE.rate), 1),
    dip: round(
      dips.length > 0
        ? dips.reduce((sum, d) => sum + d, 0) / dips.length / TEXTURE.rate
        : 0,
    ),
  };
};

export const syllablesOf = (frames, samples) => {
  const levels = frames.map((f) => f.level);
  const peak = Math.max(...levels);
  const floor = [...levels].sort((a, b) => a - b)[
    Math.floor(SYLLABLE.floor * levels.length)
  ];
  const threshold = Math.max(peak - SYLLABLE.below, floor + SYLLABLE.above);
  const loud = frames.map((f) => f.level >= threshold);
  const runs = [];
  let start = -1;
  let quiet = 0;
  loud.forEach((on, i) => {
    if (on) {
      if (start < 0) start = i;
      quiet = 0;
    } else if (start >= 0 && ++quiet > SYLLABLE.bridge) {
      runs.push([start, i - quiet]);
      start = -1;
      quiet = 0;
    }
  });
  if (start >= 0) runs.push([start, loud.length - 1 - quiet]);
  const silent = frames.filter((f) => f.level < threshold - SYLLABLE.above);
  const noise = BANDS.map((_, b) =>
    silent.length > 0 ? median(silent.map((f) => f.residual[b])) : 0,
  );
  return runs
    .filter(([a, b]) => b - a + 1 >= SYLLABLE.shortest)
    .map(([a, b]) => {
      const run = frames.slice(a, b + 1);
      const top = Math.max(...run.map((f) => f.level));
      const steady = run.filter((f) => f.level >= top - SYLLABLE.steady);
      const pitch = run.map((f, i) =>
        f.level >= top - SYLLABLE.steady ? f.f0 : null,
      );
      const filled = pitch.map((p, i) => {
        if (p !== null) return p;
        const after = pitch.findIndex((q, j) => j > i && q !== null);
        const before = pitch.findLastIndex((q, j) => j < i && q !== null);
        return pitch[after >= 0 ? after : before];
      });
      const smooth = filled.map((_, i) => {
        const near = filled.slice(Math.max(0, i - 2), i + 3);
        return near.reduce((s, v) => s + v, 0) / near.length;
      });
      const wobble = Math.sqrt(
        steady.reduce((s, f) => {
          const i = run.indexOf(f);
          return s + (1200 * Math.log2(f.f0 / smooth[i])) ** 2;
        }, 0) / steady.length,
      );
      return {
        start: run[0].at,
        duration: run.length * (HOP / RATE),
        level: round(top - peak, 1),
        pitch: resample(smooth, POINTS).map((p) => round(p, 1)),
        envelope: resample(
          run.map((f) => f.level - top),
          POINTS,
        ).map((v) => round(v, 1)),
        partials: Array.from(
          { length: Math.max(...steady.map((f) => f.partials.length)) - 1 },
          (_, m) =>
            round(
              median(
                steady.map((f) =>
                  f.partials[m + 1] === undefined
                    ? 0
                    : decibels(f.partials[m + 1] / f.partials[0]),
                ),
              ),
              1,
            ),
        ),
        residual: BANDS.map((_, b) =>
          round(
            median(
              steady.map((f) =>
                decibels(Math.max(0, f.residual[b] - noise[b]) / f.partials[0]),
              ),
            ),
            1,
          ),
        ),
        wobble: round(wobble, 1),
        texture: textureOf(
          samples,
          Math.round(run[0].at * RATE - COO.window / 2),
          Math.round(run[run.length - 1].at * RATE + COO.window / 2),
        ),
      };
    });
};

const STEADY_BUZZ = {
  below: 12,
  octave: 0.15,
  quiet: 35,
  settle: 4,
  glide: 0.003,
};

export const buzzOf = (frames, samples) => {
  const top = Math.max(...frames.map((f) => f.level));
  const steady = frames.filter((f) => f.level >= top - STEADY_BUZZ.below);
  const f0 = median(steady.map((f) => f.f0));
  const near = (f) => Math.abs(f.f0 / f0 - 1) <= STEADY_BUZZ.octave;
  const settled = (f) => {
    const i = frames.indexOf(f);
    const around = [
      frames[i - STEADY_BUZZ.settle],
      frames[i + STEADY_BUZZ.settle],
    ];
    return around.every(
      (g) =>
        g !== undefined &&
        near(g) &&
        Math.abs(g.f0 / f.f0 - 1) <= STEADY_BUZZ.glide,
    );
  };
  const clean = steady.filter(near);
  const flying = clean.filter(settled);
  const quiet = frames.filter((f) => f.level < top - STEADY_BUZZ.quiet);
  const noise = BANDS.map((_, b) =>
    quiet.length > 0 ? median(quiet.map((f) => f.residual[b])) : 0,
  );
  const count = Math.min(...clean.map((f) => f.partials.length));
  const span = [clean[0].at, clean[clean.length - 1].at].map((t) =>
    Math.round(t * RATE),
  );
  return {
    f0: round(median(clean.map((f) => f.f0)), 1),
    wander: round(
      Math.sqrt(
        clean.reduce((s, f) => s + (1200 * Math.log2(f.f0 / f0)) ** 2, 0) /
          clean.length,
      ),
      1,
    ),
    partials: Array.from({ length: count - 1 }, (_, m) =>
      round(
        median(flying.map((f) => decibels(f.partials[m + 1] / f.partials[0]))),
        1,
      ),
    ),
    residual: BANDS.map((_, b) =>
      round(
        median(
          flying.map((f) =>
            decibels(Math.max(0, f.residual[b] - noise[b]) / f.partials[0]),
          ),
        ),
        1,
      ),
    ),
    texture: textureOf(samples, span[0], span[1]),
  };
};
