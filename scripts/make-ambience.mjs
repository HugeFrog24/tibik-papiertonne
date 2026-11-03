import { writeFileSync } from "node:fs";

const RATE = 32000;
const SPEED_OF_SOUND = 343;

const randomFrom = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const pole = (frequency) => 1 - Math.exp((-2 * Math.PI * frequency) / RATE);

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

const makeLoop = (seconds, channels) => {
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

const writeWav = (file, loop, peak) => {
  const channels = loop.data.length;
  let max = 0;
  for (const channel of loop.data) {
    for (const v of channel) {
      max = Math.max(max, Math.abs(v));
    }
  }
  const gain = peak / max;
  const data = Buffer.alloc(loop.length * channels * 2);
  for (let i = 0; i < loop.length; i++) {
    for (let c = 0; c < channels; c++) {
      const v = Math.round(clamp(loop.data[c][i] * gain, -1, 1) * 32767);
      data.writeInt16LE(v, (i * channels + c) * 2);
    }
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * channels * 2, 28);
  header.writeUInt16LE(channels * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  writeFileSync(new URL(`../public/sfx/${file}`, import.meta.url), Buffer.concat([header, data]));
  console.log(`${file}: ${loop.length / RATE} s, ${channels === 1 ? "mono" : "stereo"}`);
};

const atmosphere = () => {
  const random = randomFrom(1207);
  const loop = makeLoop(24, 1);

  let brown = 0;
  let low = 0;
  loop.bed(0, 2, (t) => {
    brown = 0.995 * brown + (random() * 2 - 1) * 0.06;
    low += 0.04 * (brown - low);
    return low * (0.75 + 0.15 * Math.sin(t * 0.31) + 0.1 * Math.sin(t * 0.83));
  });

  let breeze = 0;
  loop.bed(0, 2, (t) => {
    breeze += 0.08 * (random() * 2 - 1 - breeze);
    return breeze * 0.012 * (0.6 + 0.4 * Math.sin(t * 0.7) * Math.sin(t * 0.23));
  });

  const tone = (start, duration, frequency, level, shape) => {
    const from = Math.floor(start * RATE);
    const count = Math.floor(duration * RATE);
    let phase = 0;
    for (let n = 0; n < count; n++) {
      const u = n / count;
      phase += (2 * Math.PI * frequency(u)) / RATE;
      const envelope = Math.sin(Math.PI * u) ** shape;
      loop.add(0, from + n, level * envelope * (Math.sin(phase) + 0.25 * Math.sin(2 * phase)));
    }
  };

  for (let burst = 0; burst < 14; burst++) {
    let at = random() * 24;
    const pitch = 3200 + random() * 1800;
    const chirps = 2 + Math.floor(random() * 5);
    for (let c = 0; c < chirps; c++) {
      const duration = 0.05 + random() * 0.07;
      const drop = 0.25 + random() * 0.3;
      tone(at, duration, (u) => pitch * (1 + 0.15 * Math.sin(u * 40)) * (1 - drop * u), 0.05 + random() * 0.03, 2);
      at += duration + 0.04 + random() * 0.08;
    }
  }

  for (let phrase = 0; phrase < 4; phrase++) {
    let at = 2 + phrase * 6 + random() * 2;
    for (let note = 0; note < 4; note++) {
      const duration = 0.18 + random() * 0.22;
      const from = 1500 + random() * 900;
      const to = from * (0.8 + random() * 0.5);
      tone(at, duration, (u) => from + (to - from) * u + 60 * Math.sin(u * 25), 0.035, 1.5);
      at += duration + 0.08 + random() * 0.15;
    }
  }

  writeWav("street-atmosphere.wav", loop, 0.5);
};

const passBy = (loop, random, vehicle) => {
  const { at, speed, distance, direction, engine, harmonics, diesel = 0, tyres, level } = vehicle;
  const span = 8;
  const start = Math.floor((at - span) * RATE);
  const count = Math.floor(2 * span * RATE);
  let phase = 0;
  let wobble = 0;
  const engineLow = [0, 0];
  const tyreHigh = [0];
  const tyreLow = [0, 0];
  const clatterLow = [0];
  for (let n = 0; n < count; n++) {
    const t = (start + n) / RATE - at;
    let emitted = t;
    for (let k = 0; k < 3; k++) {
      emitted = t - Math.hypot(speed * emitted, distance) / SPEED_OF_SOUND;
    }
    const x = direction * speed * emitted;
    const r = Math.hypot(x, distance);
    const receding = (speed * speed * emitted) / r;
    const doppler = 1 / (1 + receding / SPEED_OF_SOUND);
    const near = distance / r;

    wobble += 0.0005 * (random() * 2 - 1 - wobble);
    const frequency = engine * doppler * (1 + 0.015 * Math.sin(t * 1.3) + 0.4 * wobble);
    phase += (2 * Math.PI * frequency) / RATE;
    let tone = 0;
    for (let k = 1; k <= harmonics.length; k++) {
      tone += harmonics[k - 1] * Math.sin(k * phase);
    }
    const knock = Math.max(0, Math.sin(phase)) ** 12;
    clatterLow[0] += pole(1600) * ((random() * 2 - 1) * knock - clatterLow[0]);
    tone += diesel * clatterLow[0] * 6;
    const engineCut = pole(180 + 1400 * near * near);
    engineLow[0] += engineCut * (tone - engineLow[0]);
    engineLow[1] += engineCut * (engineLow[0] - engineLow[1]);

    const noise = random() * 2 - 1;
    tyreHigh[0] += pole(250) * (noise - tyreHigh[0]);
    const tyreCut = pole((500 + 2600 * near) * doppler * doppler);
    tyreLow[0] += tyreCut * (noise - tyreHigh[0] - tyreLow[0]);
    tyreLow[1] += tyreCut * (tyreLow[0] - tyreLow[1]);

    const edge = Math.min(1, (span - Math.abs(t)) / 1.5);
    const gain = level * near ** 1.4 * edge * edge;
    const sample = gain * (engineLow[1] * 0.9 + tyreLow[1] * tyres * 3);

    const pan = clamp(x / r, -1, 1) * 0.75;
    const angle = ((pan + 1) * Math.PI) / 4;
    loop.add(0, start + n, sample * Math.cos(angle));
    loop.add(1, start + n, sample * Math.sin(angle));
  }
};

const bicycleBell = (loop, at, pan, level) => {
  const partials = [
    [1, 1, 0.9],
    [1.49, 0.5, 0.6],
    [2.08, 0.35, 0.4],
    [2.71, 0.2, 0.25],
  ];
  const base = 2950;
  const angle = ((pan + 1) * Math.PI) / 4;
  for (const strike of [0, 0.16]) {
    const from = Math.floor((at + strike) * RATE);
    let low = 0;
    for (let n = 0; n < 1.6 * RATE; n++) {
      const t = n / RATE;
      let v = 0;
      for (const [ratio, amplitude, decay] of partials) {
        v += amplitude * Math.exp(-t / decay) * Math.sin(2 * Math.PI * base * ratio * t);
      }
      low += pole(3500) * (v - low);
      const attack = Math.min(1, t / 0.002);
      loop.add(0, from + n, level * attack * low * Math.cos(angle));
      loop.add(1, from + n, level * attack * low * Math.sin(angle));
    }
  }
};

const traffic = () => {
  const random = randomFrom(4711);
  const loop = makeLoop(32, 2);

  const car = [1, 0.7, 0.35, 0.2, 0.12, 0.06];
  const scooter = [1, 0.25, 0.8, 0.2, 0.6, 0.15, 0.4, 0.1, 0.3];
  const diesel = [1, 0.9, 0.5, 0.35, 0.2, 0.12, 0.08];

  const vehicles = [
    { at: 1.5, speed: 12.5, distance: 14, direction: 1, engine: 38, harmonics: car, tyres: 1, level: 1 },
    { at: 6.4, speed: 11, distance: 18, direction: -1, engine: 33, harmonics: car, tyres: 1, level: 0.9 },
    { at: 10.8, speed: 9, distance: 13, direction: 1, engine: 104, harmonics: scooter, tyres: 0.35, level: 0.55 },
    { at: 15.0, speed: 10, distance: 17, direction: -1, engine: 52, harmonics: diesel, diesel: 0.6, tyres: 1.3, level: 1.1 },
    { at: 20.6, speed: 13.5, distance: 15, direction: 1, engine: 41, harmonics: car, tyres: 1, level: 1 },
    { at: 25.4, speed: 8.5, distance: 19, direction: -1, engine: 68, harmonics: diesel, diesel: 0.8, tyres: 1.6, level: 1.3 },
    { at: 29.8, speed: 12, distance: 22, direction: 1, engine: 36, harmonics: car, tyres: 1, level: 0.8 },
  ];
  for (const vehicle of vehicles) {
    passBy(loop, random, vehicle);
  }
  bicycleBell(loop, 18.2, 0.55, 0.05);

  writeWav("street-traffic.wav", loop, 0.7);
};

atmosphere();
traffic();
