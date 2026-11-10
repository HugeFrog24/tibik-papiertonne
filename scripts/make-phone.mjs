import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { bellPresses } from "./bell-presses.mjs";
import { RATE, THROUGH_THE_DOOR, muffle, peakOf, pole, randomFrom, sfx, writeWav } from "./sfx-audio.mjs";

const BELL = { frequency: 680, trill: 16, depth: 0.45, level: 0.92, length: 5, attack: 0.003 };
const json = (relative) => JSON.parse(readFileSync(new URL(relative, import.meta.url), "utf8"));
const RHYTHM = json("../assets/recordings/doorbell-rhythm.model.json");
const STORM = json("../src/scenes/klingelsturm/bellStorm.json");
const EDGE = 0.002;
const PHONE_SPEAKER = json("../src/dialogue/voiceEffects.json").phone.filter;
const HOLD = { song: "../public/music/warteschleife.flac", from: 27, seconds: 12, fadeIn: 0.4, peak: 0.89 };

const square = (t) => {
  let value = 0;
  for (let n = 1; n * BELL.frequency < RATE / 2; n += 2) value += Math.sin(2 * Math.PI * n * BELL.frequency * t) / n;
  return value;
};

const bell = () => {
  const out = new Float64Array(Math.round(BELL.length * RATE));
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const trill = 1 - BELL.depth * (0.5 + 0.5 * Math.cos(2 * Math.PI * BELL.trill * t));
    out[i] = Math.min(1, t / BELL.attack) * trill * square(t);
  }
  const peak = peakOf(out);
  return out.map((v) => (v * BELL.level) / peak);
};



const storm = (dry) => {
  const list = bellPresses(STORM, RHYTHM);
  const first = list[0][0];
  const out = new Float64Array(Math.round((list[list.length - 1][1] - first + 0.05) * RATE));
  const edge = EDGE * RATE;
  for (const [at, until] of list) {
    const from = Math.round((at - first) * RATE);
    const to = Math.round((until - first) * RATE);
    for (let i = from; i < to; i++) out[i] = dry[i - from] * Math.min(1, (i - from) / edge, (to - i) / edge);
  }
  return out;
};

mkdirSync(sfx("phone/"), { recursive: true });
for (const old of ["phone/chime.wav", "phone/chime-door.wav", "stairwell/phone/chime-door.wav", "phone/bell-door.wav", "phone/bell-door-release.wav", "stairwell/phone/bell-door.wav", "stairwell/phone/bell-door-release.wav"]) rmSync(sfx(old), { force: true });
const dry = bell();
writeWav(sfx("phone/bell.wav"), [dry]);
const rhythm = storm(dry);
writeWav(sfx("phone/bell-storm.wav"), [rhythm]);
writeWav(sfx("phone/bell-storm-door.wav"), [muffle(rhythm)]);
console.log("phone/bell.wav, phone/bell-storm.wav, phone/bell-storm-door.wav");

const FADE = 0.005;
const tones = (length, parts) => {
  const out = new Float64Array(Math.round(length * RATE));
  for (const { from, to, frequencies, level } of parts) {
    for (let i = Math.round(from * RATE); i < Math.min(out.length, Math.round(to * RATE)); i++) {
      const t = i / RATE;
      const envelope = Math.min(1, (t - from) / FADE, (to - t) / FADE);
      for (const f of frequencies) out[i] += level * envelope * Math.sin(2 * Math.PI * f * t);
    }
  }
  return out;
};

const DTMF = { 1: [697, 1209], 2: [697, 1336], 3: [697, 1477], 4: [770, 1209], 5: [770, 1336], 6: [770, 1477], 7: [852, 1209], 8: [852, 1336], 9: [852, 1477], 0: [941, 1336] };
for (const [digit, frequencies] of Object.entries(DTMF))
  writeWav(sfx(`phone/dtmf-${digit}.wav`), [tones(0.15, [{ from: 0, to: 0.12, frequencies, level: 0.35 }])]);

const LINE_TONE = 425;
writeWav(sfx("phone/ringback.wav"), [tones(5, [{ from: 0, to: 1, frequencies: [LINE_TONE], level: 0.4 }])]);
writeWav(sfx("phone/busy.wav"), [tones(2, [0, 0.96].map((from) => ({ from, to: from + 0.48, frequencies: [LINE_TONE], level: 0.4 })))]);
writeWav(sfx("phone/beep.wav"), [tones(0.45, [{ from: 0, to: 0.4, frequencies: [1000], level: 0.45 }])]);

const CLICK = { length: 0.12, decay: 0.006, level: 0.8, seed: 110 };
const click = () => {
  const random = randomFrom(CLICK.seed);
  const out = new Float64Array(Math.round(CLICK.length * RATE));
  const a = pole(2500);
  let y = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    y += a * (random() * 2 - 1 - y);
    out[i] = CLICK.level * Math.exp(-t / CLICK.decay) * (random() * 2 - 1 - 0.6 * y);
  }
  return out;
};
writeWav(sfx("phone/click.wav"), [click()]);

const PANT = { cycle: 1 / 0.9, length: 10, seed: 4711 };
const panting = () => {
  const random = randomFrom(PANT.seed);
  const out = new Float64Array(Math.round(PANT.length * RATE));
  const band = (low, high) => {
    const a = pole(low);
    const b = pole(high);
    let slow = 0;
    let smooth = 0;
    return (x) => {
      slow += a * (x - slow);
      smooth += b * (x - slow - smooth);
      return smooth;
    };
  };
  const inhale = band(900, 3200);
  const exhale = band(250, 1100);
  for (let i = 0; i < out.length; i++) {
    const t = i / RATE;
    const phase = (t % PANT.cycle) / PANT.cycle;
    const noise = random() * 2 - 1;
    const inAmount = phase < 0.34 ? Math.sin((Math.PI * phase) / 0.34) : 0;
    const outAmount = phase >= 0.38 && phase < 0.78 ? Math.sin((Math.PI * (phase - 0.38)) / 0.4) : 0;
    out[i] = 0.9 * inAmount * inhale(noise) + 1.4 * outAmount * exhale(noise);
  }
  return out;
};
const breath = panting();
writeWav(sfx("phone/panting.wav"), [breath]);
writeWav(sfx("phone/panting-door.wav"), [muffle(breath, THROUGH_THE_DOOR)]);

const holdMusic = () => {
  const song = fileURLToPath(new URL(HOLD.song, import.meta.url));
  const run = spawnSync("ffmpeg", ["-v", "error", "-ss", String(HOLD.from), "-t", String(HOLD.seconds), "-i", song, "-ac", "1", "-ar", String(RATE), "-af", `${PHONE_SPEAKER},afade=t=in:st=0:d=${HOLD.fadeIn}`, "-f", "f32le", "-"], { maxBuffer: 1 << 26 });
  if (run.status !== 0) throw new Error(`ffmpeg failed on the hold music: ${run.stderr}`);
  const samples = Float32Array.from({ length: run.stdout.length / 4 }, (_, i) => run.stdout.readFloatLE(i * 4));
  const scale = HOLD.peak / peakOf(samples);
  return samples.map((v) => v * scale);
};
writeWav(sfx("phone/warteschleife.wav"), [holdMusic()]);
console.log("phone/dtmf-0..9.wav, ringback, busy, beep, click, panting, panting-door, warteschleife");
