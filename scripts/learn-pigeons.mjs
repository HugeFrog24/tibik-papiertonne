import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sing, voiceOf } from "./pigeon-voice.mjs";
import { RATE, decode, randomFrom } from "./sfx-audio.mjs";
import { BANDS, analyse, round, syllablesOf } from "./spectral.mjs";

const RECORDINGS = fileURLToPath(
  new URL("../assets/recordings/", import.meta.url),
);
const FIT = {
  rounds: 8,
  step: 0.5,
  takes: 8,
  gap: 0.2,
  seed: 2207,
  floor: -90,
  ceiling: 10,
};

const heardAs = (voice, s, loudest) => {
  const reference = sing(voice, loudest);
  const takes = [
    reference,
    ...Array.from({ length: FIT.takes }, () => sing(voice, s)),
  ];
  const gap = Math.round(FIT.gap * RATE);
  const length = takes.reduce((sum, t) => sum + t.length + gap, gap);
  const tape = new Float32Array(length);
  let at = gap;
  for (const take of takes) {
    tape.set(take, at);
    at += take.length + gap;
  }
  const after = (gap + reference.length) / RATE;
  const heard = syllablesOf(analyse(tape), tape).filter((h) => h.start > after);
  if (heard.length === 0) return null;
  const mean = (pick) =>
    heard.reduce((sum, h) => sum + pick(h), 0) / heard.length;
  return {
    level: mean((h) => h.level),
    partials: s.partials.map((_, m) => mean((h) => h.partials[m])),
    residual: s.residual.map((_, b) => mean((h) => h.residual[b])),
    wobble: mean((h) => h.wobble),
    modulation: s.texture.modulation.map((_, k) =>
      mean((h) => h.texture.modulation[k]),
    ),
    dips: mean((h) => h.texture.dips),
  };
};

const scale = (value, want, got) =>
  got > 1e-6 && want > 1e-6 ? value * (want / got) ** FIT.step : value;
const shift = (value, want, got) =>
  Math.min(FIT.ceiling, Math.max(FIT.floor, value + FIT.step * (want - got)));

const fitted = (voice, s, loudest) => {
  let sung = s;
  for (let r = 0; r < FIT.rounds; r++) {
    const heard = heardAs(voice, sung, loudest);
    if (heard === null) break;
    sung = {
      ...sung,
      level: Math.min(0, sung.level + FIT.step * (s.level - heard.level)),
      partials: sung.partials.map((db, m) =>
        shift(db, s.partials[m], heard.partials[m]),
      ),
      residual: sung.residual.map((db, b) =>
        shift(db, s.residual[b], heard.residual[b]),
      ),
      texture: {
        ...sung.texture,
        modulation: sung.texture.modulation.map((d, k) =>
          scale(d, s.texture.modulation[k], heard.modulation[k]),
        ),
        dips: scale(sung.texture.dips, s.texture.dips, heard.dips),
      },
    };
  }
  const last = heardAs(voice, sung, loudest);
  if (last !== null) {
    const off = (want, got) => Math.abs(want - got);
    const ratio = (want, got) =>
      want > 1e-3 ? Math.max(want / got, got / want) : 1;
    console.log(
      `  ${s.start.toFixed(2)} s: level ${(last.level - s.level).toFixed(1)} dB, spectrum within ${Math.max(...s.residual.map((w, b) => off(w, last.residual[b])), ...s.partials.slice(0, 2).map((w, m) => off(w, last.partials[m]))).toFixed(1)} dB, flutter within ${Math.max(...s.texture.modulation.map((w, k) => ratio(w, last.modulation[k]))).toFixed(2)}x, dropouts ${last.dips.toFixed(1)}/${s.texture.dips}`,
    );
  }
  return {
    level: round(sung.level, 1),
    partials: sung.partials.map((v) => round(v, 1)),
    residual: sung.residual.map((v) => round(v, 1)),
    wobble: round(sung.wobble, 1),
    texture: {
      ...sung.texture,
      modulation: sung.texture.modulation.map((v) => round(v)),
      dips: round(sung.texture.dips, 1),
    },
  };
};

const manifest = JSON.parse(
  readFileSync(path.join(RECORDINGS, "recordings.json"), "utf8"),
);
const scratch = mkdtempSync(path.join(tmpdir(), "pigeons-"));
try {
  const voice = voiceOf(randomFrom(FIT.seed), BANDS);
  const recordings = manifest["street-pigeons"].map(({ file }) => {
    const samples = decode(path.join(RECORDINGS, file), scratch);
    const syllables = syllablesOf(analyse(samples), samples);
    const first = syllables[0].start;
    const loudest = syllables.find((s) => s.level === 0);
    console.log(`${file}: ${syllables.length} syllables`);
    return {
      file,
      syllables: syllables.map((s) => ({
        ...s,
        start: round(s.start - first),
        duration: round(s.duration),
        voice: fitted(voice, s, loudest),
      })),
    };
  });
  writeFileSync(
    path.join(RECORDINGS, "street-pigeons.model.json"),
    `${JSON.stringify({ bands: BANDS, recordings }, null, 2)}\n`,
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
