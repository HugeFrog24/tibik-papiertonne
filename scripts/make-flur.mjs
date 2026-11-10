import { mkdirSync } from "node:fs";
import { THROUGH_THE_DOOR, decode, fullScale, muffle, sfx, sfxPath, writeWav } from "./sfx-audio.mjs";
import { withScratch } from "./scratch.mjs";

const STEPS = [0, 1, 2, 3];
const BLOWS = [0, 1, 2, 3, 4];
const ON_HIS_SIDE = { cutoff: 2 * THROUGH_THE_DOOR.cutoff, level: 1 };

withScratch("flur-", (scratch) => {
  mkdirSync(sfx("flur/"), { recursive: true });
  for (const n of STEPS) {
    const dry = decode(sfxPath(`footstep_concrete_00${n}.ogg`), scratch);
    writeWav(sfx(`flur/footstep-door-${n}.wav`), [muffle(dry, THROUGH_THE_DOOR)]);
  }
  writeWav(sfx("flur/flap.wav"), [decode(sfxPath("bookPlace1.ogg"), scratch)]);
  writeWav(sfx("flur/thud-door.wav"), [muffle(decode(sfxPath("impactSoft_heavy_000.ogg"), scratch), THROUGH_THE_DOOR)]);
  for (const n of BLOWS) {
    writeWav(sfx(`flur/door-pound-${n}.wav`), [fullScale(muffle(decode(sfxPath(`pound/door-pound-${n}.wav`), scratch), ON_HIS_SIDE))]);
  }
  console.log("flur/footstep-door-0..3.wav, flur/flap.wav, flur/thud-door.wav, flur/door-pound-0..4.wav");
});
