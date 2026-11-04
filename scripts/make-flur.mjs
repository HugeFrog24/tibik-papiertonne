import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { THROUGH_THE_DOOR, decode, muffle, sfx, sfxPath, writeWav } from "./sfx-audio.mjs";

const STEPS = [0, 1, 2, 3];

const scratch = mkdtempSync(path.join(tmpdir(), "flur-"));
try {
  mkdirSync(sfx("flur/"), { recursive: true });
  for (const n of STEPS) {
    const dry = decode(sfxPath(`footstep_concrete_00${n}.ogg`), scratch);
    writeWav(sfx(`flur/footstep-door-${n}.wav`), [muffle(dry, THROUGH_THE_DOOR)]);
  }
  writeWav(sfx("flur/flap.wav"), [decode(sfxPath("bookPlace1.ogg"), scratch)]);
  writeWav(sfx("flur/thud-door.wav"), [muffle(decode(sfxPath("impactSoft_heavy_000.ogg"), scratch), THROUGH_THE_DOOR)]);
  console.log("flur/footstep-door-0..3.wav, flur/flap.wav, flur/thud-door.wav");
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
