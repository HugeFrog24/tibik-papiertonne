import { dropouts, shapedBand } from "./noises.mjs";
import { RATE } from "./sfx-audio.mjs";
import { BANDS, MODULATION } from "./spectral.mjs";

export const FLY_VOICE = {
  wander: [0.05, 1],
  noiseLength: 1 << 17,
  dropout: { depth: 0.3, shortest: 0.01 },
};

const band = (random, [lo, hi]) =>
  shapedBand(random, lo, hi, FLY_VOICE.noiseLength);

export const flyVoiceOf = (random) => ({
  random,
  breath: BANDS.map((b) => band(random, b)),
  flutter: MODULATION.map((b) => band(random, b)),
  wander: band(random, FLY_VOICE.wander),
});

export const buzz = (voice, sung, seconds, pitch = 1) => {
  const { random } = voice;
  const count = Math.round(seconds * RATE);
  const offsets = sung.partials.map(() => random() * 2 * Math.PI);
  const gaps = dropouts(random, sung.texture, count, FLY_VOICE.dropout);
  const out = new Float32Array(count);
  let phase = 0;
  for (let n = 0; n < count; n++) {
    const f = sung.f0 * pitch * 2 ** ((sung.wander * voice.wander()) / 1200);
    phase += (2 * Math.PI * f) / RATE;
    let value = Math.sin(phase);
    sung.partials.forEach((db, m) => {
      if ((m + 2) * f < RATE / 2)
        value += 10 ** (db / 20) * Math.sin((m + 2) * phase + offsets[m]);
    });
    sung.residual.forEach((db, b) => {
      value += Math.SQRT1_2 * 10 ** (db / 20) * voice.breath[b]();
    });
    const flutter = sung.texture.modulation.reduce(
      (sum, depth, k) => sum + depth * voice.flutter[k](),
      0,
    );
    out[n] = value * Math.max(0, 1 + flutter) * gaps[n];
  }
  return out;
};

export const looped = (samples, fade) => {
  const overlap = Math.round(fade * RATE);
  const length = samples.length - overlap;
  const out = samples.slice(0, length);
  for (let i = 0; i < overlap; i++) {
    const w = ((i / overlap) * Math.PI) / 2;
    out[i] = samples[length + i] * Math.cos(w) + samples[i] * Math.sin(w);
  }
  return out;
};
