import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { URL, fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const DIALOGUE = path.join(ROOT, "public", "dialogue");
const OUT = path.join(ROOT, "src", "dialogue", "takes.json");
const SILENCE = { noise: "-45dB", seconds: 0.18 };
const AUDIO = /\.(wav|mp3|ogg|flac)$/i;

const round = (v) => Math.round(v * 1000) / 1000;

const durationOf = (file) => {
  const probe = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" });
  if (probe.status !== 0) throw new Error(`ffprobe failed on ${file}: ${probe.stderr}`);
  return Number(probe.stdout.trim());
};

const silencesOf = (file) => {
  const run = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", `silencedetect=noise=${SILENCE.noise}:d=${SILENCE.seconds}`, "-f", "null", "-"], { encoding: "utf8" });
  if (run.status !== 0) throw new Error(`ffmpeg failed on ${file}: ${run.stderr}`);
  const marks = [...run.stderr.matchAll(/silence_(start|end): ([\d.]+)/g)].map(([, kind, at]) => ({ kind, at: Number(at) }));
  const spans = [];
  for (let i = 0; i < marks.length; i++) if (marks[i].kind === "start") spans.push([marks[i].at, marks[i + 1]?.kind === "end" ? marks[i + 1].at : Infinity]);
  return spans;
};

export const speechOf = (seconds, silences) => {
  const speech = [];
  let from = 0;
  for (const [start, end] of silences) {
    if (start > from) speech.push([round(from), round(Math.min(start, seconds))]);
    from = Math.min(end, seconds);
  }
  if (from < seconds) speech.push([round(from), round(seconds)]);
  return speech.filter(([a, b]) => b - a > 0.02);
};

const measure = () => {
  const manifest = {};
  for (const lang of readdirSync(DIALOGUE, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort()) {
    const folder = path.join(DIALOGUE, lang);
    manifest[lang] = {};
    for (const name of readdirSync(folder).filter((f) => AUDIO.test(f)).sort()) {
      const file = path.join(folder, name);
      const seconds = durationOf(file);
      manifest[lang][name.replace(AUDIO, "")] = { file: name, seconds: round(seconds), speech: speechOf(seconds, silencesOf(file)) };
    }
  }
  return manifest;
};

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  if (!existsSync(DIALOGUE)) throw new Error(`no recordings at ${DIALOGUE}`);
  writeFileSync(OUT, `${JSON.stringify(measure(), null, 1)}\n`);
  process.stdout.write(`wrote ${OUT}\n`);
}
