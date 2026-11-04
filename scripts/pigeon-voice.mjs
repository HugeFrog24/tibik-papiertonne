import { RATE } from "./sfx-audio.mjs";
import { dropouts, shapedBand } from "./noises.mjs";
import { LOBE_WIDTH, MODULATION } from "./spectral.mjs";

export const VOICE = {
  edge: 0.01,
  jitter: [0.5, 12],
  around: [100, 130],
  noiseLength: 1 << 17,
  dropout: { depth: 0.15, shortest: 0.007 },
};

const along = (points, u) => {
  const x = Math.min(1, Math.max(0, u)) * (points.length - 1);
  const a = Math.floor(x);
  const b = Math.min(points.length - 1, a + 1);
  return points[a] + (points[b] - points[a]) * (x - a);
};

const bandNoise = (random, lo, hi) =>
  shapedBand(random, lo, hi, VOICE.noiseLength);

export const voiceOf = (random, bands) => ({
  random,
  bands,
  breath: bands.map(([lo, hi]) => bandNoise(random, lo, hi)),
  flutter: MODULATION.map(([lo, hi]) => bandNoise(random, lo, hi)),
  jitter: bandNoise(random, ...VOICE.jitter),
  around: VOICE.around.map((width) => [
    bandNoise(random, LOBE_WIDTH, width),
    bandNoise(random, LOBE_WIDTH, width),
  ]),
});

export const sing = (
  voice,
  s,
  { pitch = 1, tempo = 1, level = s.level } = {},
) => {
  const { random } = voice;
  const centre =
    (s.pitch.reduce((sum, f) => sum + f, 0) / s.pitch.length) * pitch;
  const own = voice.bands.findIndex(([lo, hi]) => centre >= lo && centre < hi);
  const room =
    own < 0
      ? 0
      : Math.min(
          Math.min(...s.pitch) * pitch - voice.bands[own][0],
          voice.bands[own][1] - Math.max(...s.pitch) * pitch,
        );
  const fits = VOICE.around.findLastIndex((width) => width <= room);
  const around = voice.around[Math.max(0, fits)];
  const count = Math.round(s.duration * tempo * RATE);
  const edge = Math.round(VOICE.edge * RATE);
  const offsets = s.partials.map(() => random() * 2 * Math.PI);
  const gaps = dropouts(random, s.texture, count, VOICE.dropout);
  const out = new Float32Array(count);
  let phase = 0;
  for (let n = 0; n < count; n++) {
    const u = n / (count - 1);
    const f =
      along(s.pitch, u) * pitch * 2 ** ((s.wobble * voice.jitter()) / 1200);
    phase += (2 * Math.PI * f) / RATE;
    const fade = Math.min(1, n / edge, (count - 1 - n) / edge);
    let value = Math.sin(phase);
    s.partials.forEach((db, m) => {
      if ((m + 2) * f < RATE / 2)
        value += 10 ** (db / 20) * Math.sin((m + 2) * phase + offsets[m]);
    });
    s.residual.forEach((db, k) => {
      const breath =
        k === own
          ? Math.SQRT1_2 *
            (around[0]() * Math.sin(phase) + around[1]() * Math.cos(phase))
          : voice.breath[k]();
      value += Math.SQRT1_2 * 10 ** (db / 20) * breath;
    });
    const flutter = s.texture.modulation.reduce(
      (sum, depth, k) => sum + depth * voice.flutter[k](),
      0,
    );
    out[n] =
      value *
      Math.max(0, 1 + flutter) *
      gaps[n] *
      10 ** ((level + along(s.envelope, u)) / 20) *
      (0.5 - 0.5 * Math.cos(Math.PI * fade));
  }
  return out;
};
