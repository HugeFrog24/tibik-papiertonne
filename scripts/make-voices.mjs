import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { URL, fileURLToPath } from "node:url";
import { withScratch } from "./scratch.mjs";
import { THROUGH_THE_DOOR, decode, muffle, peakOf, writeWav } from "./sfx-audio.mjs";
import { WET, impulse } from "./stairwell-room.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIALOGUE = path.join(ROOT, "public", "dialogue");
const read = (file) => JSON.parse(readFileSync(path.join(ROOT, "src", "dialogue", file), "utf8"));
const TAKES = read("takes.json");
const EFFECTS = Object.entries(read("voiceEffects.json"));
const LOUDNESS = read("voiceLoudness.json");
const LEVEL = { folder: "level", limit: 0.891, within: 0.4, rounds: 4, headroom: 0.9 };
const EFFECT_BY_NAME = Object.fromEntries(EFFECTS);

const voiceOfId = (id) => id.split("_").slice(2).join("_");

const effectOf = (id) => EFFECTS.find(([, effect]) => effect.voices.includes(voiceOfId(id)) || effect.takes.includes(id));

const ffmpeg = (args, what) => {
  const run = spawnSync("ffmpeg", ["-hide_banner", "-nostats", ...args], { encoding: "utf8" });
  if (run.status !== 0) throw new Error(`ffmpeg failed on ${what}: ${run.stderr}`);
  return run.stderr;
};

const loudnessOf = (file) => Number(/I:\s*(-?[\d.]+) LUFS/.exec(ffmpeg(["-i", file, "-af", "ebur128", "-f", "null", "-"], file).split("Summary:")[1])[1]);

const hallImpulse = (hall, seconds, scratch) => {
  const ir = path.join(scratch, "hall.wav");
  const decay = `exp(-6.9078*t/${hall.rt60})`;
  ffmpeg(["-v", "error", "-y", "-f", "lavfi", "-i", `anoisesrc=d=${seconds}:c=white:r=48000:a=0.5:seed=4711`, "-af", `highpass=f=${hall.highpass},lowpass=f=${hall.lowpass},volume=${decay}:eval=frame,adelay=${Math.round(hall.predelay * 1000)}`, "-ac", "1", "-c:a", "pcm_f32le", ir], "the hall");
  return ir;
};

const inTheHall = (source, effect, scratch) => {
  const dry = path.join(scratch, "dry.wav");
  const wet = path.join(scratch, "wet.wav");
  const mixed = path.join(scratch, "hall-mixed.wav");
  ffmpeg(["-v", "error", "-y", "-i", source, "-af", `aformat=sample_rates=48000:channel_layouts=mono,apad=pad_dur=${effect.tail}`, "-c:a", "pcm_f32le", dry], source);
  ffmpeg(["-v", "error", "-y", "-i", dry, "-i", hallImpulse(effect.hall, effect.tail, scratch), "-filter_complex", "[0:a][1:a]afir=irnorm=-1", "-c:a", "pcm_f32le", wet], source);
  const gain = loudnessOf(dry) + effect.hall.wet - loudnessOf(wet);
  ffmpeg(["-v", "error", "-y", "-i", dry, "-i", wet, "-filter_complex", `[1:a]volume=${gain.toFixed(2)}dB[w];[0:a][w]amix=inputs=2:normalize=0:duration=first`, "-c:a", "pcm_f32le", mixed], source);
  return mixed;
};

const inTheStairwell = (source, effect, scratch) => {
  const ir = path.join(scratch, "stairwell-ir.wav");
  writeWav(ir, [impulse()]);
  const dry = path.join(scratch, "stairwell-dry.wav");
  const wet = path.join(scratch, "stairwell-wet.wav");
  const mixed = path.join(scratch, "stairwell-mixed.wav");
  ffmpeg(["-v", "error", "-y", "-i", source, "-af", `aformat=sample_rates=32000:channel_layouts=mono,apad=pad_dur=${effect.tail}`, "-c:a", "pcm_f32le", dry], source);
  ffmpeg(["-v", "error", "-y", "-i", dry, "-i", ir, "-filter_complex", "[0:a][1:a]afir=irnorm=-1", "-c:a", "pcm_f32le", wet], source);
  ffmpeg(["-v", "error", "-y", "-i", dry, "-i", wet, "-filter_complex", `[1:a]volume=${WET * (effect.wet ?? 1)}[w];[0:a][w]amix=inputs=2:normalize=0:duration=first`, "-c:a", "pcm_f32le", mixed], source);
  return mixed;
};

const throughTheDoor = (source, scratch) => {
  const muffled = muffle(decode(source, scratch), THROUGH_THE_DOOR);
  const scale = LEVEL.headroom / peakOf(muffled);
  const out = path.join(scratch, "door.wav");
  writeWav(out, [Float32Array.from(muffled, (v) => v * scale)]);
  return out;
};

const filtered = (source, effect, scratch) => {
  if (!effect?.filter) return source;
  const out = path.join(scratch, "filtered.wav");
  ffmpeg(["-v", "error", "-y", "-i", source, "-ac", "1", "-ar", "48000", "-af", effect.filter, "-c:a", "pcm_f32le", out], source);
  return out;
};

const shaped = (source, effect, scratch) => {
  const speaker = filtered(source, effect, scratch);
  if (effect?.hall) return inTheHall(speaker, effect, scratch);
  if (effect?.room === "stairwell") return inTheStairwell(speaker, effect, scratch);
  if (effect?.room === "door") return throughTheDoor(speaker, scratch);
  return speaker;
};

const leveled = (source, out, effect, target, scratch) => {
  let current = path.join(scratch, "0.wav");
  const input = shaped(source, effect, scratch);
  ffmpeg(["-v", "error", "-y", "-i", input, "-ac", "1", "-ar", "48000", "-c:a", "pcm_f32le", current], source);
  for (let round = 1; round <= LEVEL.rounds; round++) {
    const gain = target - loudnessOf(current);
    if (Math.abs(gain) <= LEVEL.within && round > 1) break;
    const next = path.join(scratch, `${round}.wav`);
    ffmpeg(["-v", "error", "-y", "-i", current, "-af", `volume=${gain.toFixed(2)}dB,alimiter=limit=${LEVEL.limit}:attack=5:release=50:level=disabled:latency=1`, "-c:a", "pcm_f32le", next], source);
    current = next;
  }
  ffmpeg(["-v", "error", "-y", "-i", current, "-c:a", "pcm_s16le", out], source);
  return loudnessOf(out);
};

const produced = new Set();

for (const [lang, takes] of Object.entries(TAKES)) {
  for (const [id, take] of Object.entries(takes)) {
    const found = effectOf(id);
    const voice = LOUDNESS[voiceOfId(id)];
    if (voice === undefined) throw new Error(`no loudness for the voice of ${id}`);
    const made = found ? [found, ...(found[1].inside ? [[found[1].inside, EFFECT_BY_NAME[found[1].inside]]] : [])] : [[LEVEL.folder, undefined]];
    for (const [name, effect] of made) {
      const target = voice + (effect?.level ?? 0);
      const out = path.join(DIALOGUE, lang, name, take.file.replace(/\.[^.]+$/, ".wav"));
      mkdirSync(path.dirname(out), { recursive: true });
      const reached = withScratch("voice-", (scratch) => leveled(path.join(DIALOGUE, lang, take.file), out, effect, target, scratch));
      produced.add(out);
      process.stdout.write(`${lang} ${path.relative(ROOT, out)} ${reached.toFixed(1)} LUFS (wants ${target})\n`);
    }
  }
}

for (const lang of Object.keys(TAKES)) {
  for (const folder of [LEVEL.folder, ...EFFECTS.map(([name]) => name)]) {
    const dir = path.join(DIALOGUE, lang, folder);
    if (!existsSync(dir)) continue;
    for (const file of readdirSync(dir).filter((name) => name.endsWith(".wav"))) {
      const stale = path.join(dir, file);
      if (produced.has(stale)) continue;
      rmSync(stale);
      process.stdout.write(`removed ${path.relative(ROOT, stale)}\n`);
    }
  }
}
