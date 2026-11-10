import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { URL, fileURLToPath } from "node:url";
import { withScratch } from "./scratch.mjs";

const SFX = fileURLToPath(new URL("../public/sfx/", import.meta.url));
const PEAK = -1;
const BODY = "highpass=f=160,highpass=f=160,equalizer=f=400:t=q:w=1.2:g=9,equalizer=f=1200:t=q:w=1:g=4,equalizer=f=3500:t=q:w=1:g=5";
const THUD = "highpass=f=50,volume=12dB,asoftclip=type=tanh,equalizer=f=250:t=q:w=1:g=6,equalizer=f=500:t=q:w=1:g=6,equalizer=f=1000:t=q:w=1:g=3";
const SOURCES = [
  ...[0, 1, 2, 3].map((n) => ({ name: `footstep_concrete_00${n}`, chain: BODY })),
  { name: "impactSoft_heavy_000", chain: THUD },
];

const ffmpeg = (args, what) => {
  const run = spawnSync("ffmpeg", ["-hide_banner", "-nostats", ...args], { encoding: "utf8" });
  if (run.status !== 0) throw new Error(`ffmpeg failed on ${what}: ${run.stderr}`);
  return run.stderr;
};

const peakOf = (file) => Number(/Peak level dB: (-?[\d.]+)/.exec(ffmpeg(["-i", file, "-af", "astats=measure_overall=Peak_level:measure_perchannel=none", "-f", "null", "-"], file).split("Overall")[1])[1]);

mkdirSync(path.join(SFX, "street"), { recursive: true });
withScratch("street-steps-", (scratch) => {
  for (const { name, chain } of SOURCES) {
    const shaped = path.join(scratch, `${name}.wav`);
    ffmpeg(["-v", "error", "-y", "-i", path.join(SFX, `${name}.ogg`), "-ac", "1", "-ar", "48000", "-af", chain, "-c:a", "pcm_f32le", shaped], name);
    const out = path.join(SFX, "street", `${name}.wav`);
    ffmpeg(["-v", "error", "-y", "-i", shaped, "-af", `volume=${(PEAK - 0.05 - peakOf(shaped)).toFixed(2)}dB`, "-c:a", "pcm_s16le", out], name);
    process.stdout.write(`street/${name}.wav peak ${peakOf(out).toFixed(2)} dBFS\n`);
  }
});
