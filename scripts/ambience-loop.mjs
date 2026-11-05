import { RATE, pole, sfx, writeWav } from "./sfx-audio.mjs";

export const makeLoop = (seconds, channels) => {
  const length = seconds * RATE;
  const data = Array.from({ length: channels }, () => new Float32Array(length));
  return {
    length,
    data,
    add(channel, index, value) {
      data[channel][((index % length) + length) % length] += value;
    },
    bed(channel, fadeSeconds, sample) {
      const fade = fadeSeconds * RATE;
      const rendered = new Float32Array(length + fade);
      for (let i = 0; i < rendered.length; i++) {
        rendered[i] = sample(i / RATE);
      }
      for (let i = 0; i < length; i++) {
        const w = i < fade ? i / fade : 1;
        data[channel][i] += rendered[i] * w + (i < fade ? rendered[length + i] * (1 - w) : 0);
      }
    },
  };
};

const writeLoop = (file, loop, peak, fixedGain) => {
  const channels = loop.data.length;
  let max = 0;
  for (const channel of loop.data) {
    for (const v of channel) {
      max = Math.max(max, Math.abs(v));
    }
  }
  const gain = fixedGain ?? peak / max;
  writeWav(sfx(file), loop.data, gain);
  console.log(`${file}: ${loop.length / RATE} s, ${channels === 1 ? "mono" : "stereo"}`);
  return gain;
};

export const MUFFLED = { cutoff: 450, level: 10 ** (-12 / 20) };
const muffleLoop = (loop) => {
  const a = pole(MUFFLED.cutoff);
  const data = loop.data.map((channel) => Float32Array.from(channel));
  for (const channel of data) {
    for (let stage = 0; stage < 2; stage++) {
      let y = 0;
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < channel.length; i++) {
          y += a * (channel[i] - y);
          if (pass === 1) channel[i] = y;
        }
      }
    }
  }
  return { ...loop, data };
};
export const writeWithMuffled = (name, loop, peak) => {
  const gain = writeLoop(`${name}.wav`, loop, peak);
  writeLoop(`${name}-muffled.wav`, muffleLoop(loop), peak, gain * MUFFLED.level);
};
