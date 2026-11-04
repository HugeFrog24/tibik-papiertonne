import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buzz, flyVoiceOf } from "./fly-voice.mjs";
import { decode, randomFrom } from "./sfx-audio.mjs";
import { BANDS, BUZZ, analyse, buzzOf, round } from "./spectral.mjs";

const RECORDINGS = fileURLToPath(
  new URL("../assets/recordings/", import.meta.url),
);
const FIT = {
  rounds: 10,
  step: 0.5,
  seconds: 6,
  seed: 3301,
  floor: -90,
  ceiling: 10,
};
const FLIES = [
  { sound: "fly-buzz-0", recording: 0, pitch: 1 },
  { sound: "fly-buzz-1", recording: 1, pitch: 1 },
  { sound: "fly-buzz-2", recording: 0, pitch: 1.06 },
];

const shift = (value, want, got) =>
  Math.min(FIT.ceiling, Math.max(FIT.floor, value + FIT.step * (want - got)));
const scale = (value, want, got) =>
  got > 1e-6 && want > 1e-6 ? value * (want / got) ** FIT.step : value;

const fitted = (voice, heard) => {
  let sung = heard;
  for (let r = 0; r < FIT.rounds; r++) {
    const sound = buzz(voice, sung, FIT.seconds);
    const got = buzzOf(analyse(sound, BUZZ), sound);
    sung = {
      ...sung,
      wander: scale(sung.wander, heard.wander, got.wander),
      partials: sung.partials.map((db, m) =>
        shift(db, heard.partials[m], got.partials[m]),
      ),
      residual: sung.residual.map((db, b) =>
        shift(db, heard.residual[b], got.residual[b]),
      ),
      texture: {
        ...sung.texture,
        modulation: sung.texture.modulation.map((d, k) =>
          scale(d, heard.texture.modulation[k], got.texture.modulation[k]),
        ),
        dips: scale(sung.texture.dips, heard.texture.dips, got.texture.dips),
      },
    };
  }
  return {
    f0: heard.f0,
    wander: round(sung.wander, 1),
    partials: sung.partials.map((v) => round(v, 1)),
    residual: sung.residual.map((v) => round(v, 1)),
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
const scratch = mkdtempSync(path.join(tmpdir(), "flies-"));
try {
  const voice = flyVoiceOf(randomFrom(FIT.seed));
  const recordings = manifest.flies.map(({ file }) => {
    const samples = decode(path.join(RECORDINGS, file), scratch);
    const heard = buzzOf(analyse(samples, BUZZ), samples);
    console.log(`${file}: ${heard.f0} Hz`);
    return { file, heard, voice: fitted(voice, heard) };
  });
  writeFileSync(
    path.join(RECORDINGS, "flies.model.json"),
    `${JSON.stringify({ bands: BANDS, recordings, flies: FLIES }, null, 2)}\n`,
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
