import { RATE } from "./sfx-audio.mjs";
import { fft } from "./spectral.mjs";

export const shapedBand = (random, lo, hi, size) => {
  const re = new Float64Array(size);
  const im = new Float64Array(size);
  const from = Math.max(1, Math.round((lo / RATE) * size));
  const to = Math.min(size / 2 - 1, Math.round((hi / RATE) * size));
  for (let k = from; k <= to; k++) {
    const angle = random() * 2 * Math.PI;
    re[k] = re[size - k] = Math.cos(angle);
    im[k] = Math.sin(angle);
    im[size - k] = -im[k];
  }
  fft(re, im);
  const rms = Math.sqrt(re.reduce((sum, v) => sum + v * v, 0) / size);
  let i = 0;
  return () => re[i++ % size] / rms;
};

export const dropouts = (random, texture, count, dropout) => {
  const gain = new Float32Array(count).fill(1);
  if (texture.dips <= 0) return gain;
  const below =
    1 - (2 / Math.PI) * Math.asin(Math.sqrt(0.5 / (1 - dropout.depth)));
  const wait = () => -Math.log(1 - random()) / texture.dips;
  for (let t = wait(); t * RATE < count; t += wait()) {
    const at = Math.round(t * RATE);
    const width = Math.round(
      Math.max(
        dropout.shortest,
        (-Math.log(1 - random()) * texture.dip) / below,
      ) * RATE,
    );
    for (let i = 0; i < width && at + i < count; i++) {
      gain[at + i] *=
        1 - (1 - dropout.depth) * Math.sin((Math.PI * (i + 0.5)) / width) ** 2;
    }
  }
  return gain;
};
