import { RATE, peakOf, pole, randomFrom, sfx, writeWav } from "./sfx-audio.mjs";

const PULL = { seconds: 0.6, travel: 0.25 };
const GLIDER_SPACING = 0.06;
const HISS = { low: 2200, high: 6500, level: 0.05 };
const RUMBLE = { low: 350, high: 900, level: 0.04 };
const CLICK = { pitch: [2800, 4600], decay: 0.0025, body: 1300, level: 0.5 };
const PEAK = 0.8;

const smoothstep = (k) => k * k * (3 - 2 * k);
const speed = (k) => 6 * k * (1 - k);
const random = randomFrom(1207);
const length = Math.round(PULL.seconds * RATE);

const band = (low, high) => {
  const a = pole(high);
  const b = pole(low);
  let fast = 0;
  let slow = 0;
  return (v) => {
    fast += a * (v - fast);
    slow += b * (fast - slow);
    return fast - slow;
  };
};

const hiss = band(HISS.low, HISS.high);
const rumble = band(RUMBLE.low, RUMBLE.high);
const out = new Float32Array(length);
for (let i = 0; i < length; i++) {
  const v = speed(i / length);
  const noise = random() * 2 - 1;
  out[i] = hiss(noise) * HISS.level * v ** 1.2 + rumble(noise) * RUMBLE.level * v;
}

const clickAt = (start, gain) => {
  const pitch = CLICK.pitch[0] + random() * (CLICK.pitch[1] - CLICK.pitch[0]);
  const span = Math.round(CLICK.decay * 8 * RATE);
  for (let j = 0; j < span && start + j < length; j++) {
    const t = j / RATE;
    const ring = Math.sin(2 * Math.PI * pitch * t) + 0.5 * Math.sin(2 * Math.PI * CLICK.body * t);
    out[start + j] += ring * Math.exp(-t / CLICK.decay) * gain * CLICK.level;
  }
};

let next = GLIDER_SPACING * (0.3 + 0.4 * random());
for (let i = 0; i < length; i++) {
  const travelled = PULL.travel * smoothstep(i / length);
  if (travelled >= next) {
    clickAt(i, 0.4 + 0.6 * speed(i / length) * (0.7 + 0.3 * random()));
    next += GLIDER_SPACING * (0.6 + 0.8 * random());
  }
}

writeWav(sfx("curtain-gliders.wav"), [out], PEAK / peakOf(out));
console.log(`curtain-gliders.wav: ${PULL.seconds} s, mono`);
