import { readFileSync } from "node:fs";
import { buzz, flyVoiceOf, looped } from "./fly-voice.mjs";
import { randomFrom, sfx, writeWav } from "./sfx-audio.mjs";

const LOOP = { seconds: 6, fade: 0.5, peak: 0.5, seed: 1907 };
const model = JSON.parse(
  readFileSync(
    new URL("../assets/recordings/flies.model.json", import.meta.url),
    "utf8",
  ),
);

model.flies.forEach((fly, i) => {
  const voice = flyVoiceOf(randomFrom(LOOP.seed + 31 * i));
  const sound = looped(
    buzz(
      voice,
      model.recordings[fly.recording].voice,
      LOOP.seconds + LOOP.fade,
      fly.pitch,
    ),
    LOOP.fade,
  );
  const peak = sound.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  writeWav(sfx(`${fly.sound}.wav`), [sound], LOOP.peak / peak);
  console.log(
    `${fly.sound}.wav: ${LOOP.seconds} s at ${(model.recordings[fly.recording].heard.f0 * fly.pitch).toFixed(0)} Hz`,
  );
});
