import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { decode, passage } from "./sfx-audio.mjs";
import { writeWithMuffled } from "./ambience-loop.mjs";
import { withScratch } from "./scratch.mjs";

const RECORDINGS = fileURLToPath(new URL("../assets/recordings/", import.meta.url));
const PASSAGE = { from: 0.8, seconds: 17.5, fadeIn: 0.4, fadeOut: 1.2 };
const PEAK = 0.8;

const recordings = JSON.parse(readFileSync(path.join(RECORDINGS, "recordings.json"), "utf8"));
const [recording] = recordings.blackbird;
withScratch("blackbird-", (scratch) => {
  const samples = passage(decode(path.join(RECORDINGS, recording.file), scratch), PASSAGE);
  writeWithMuffled("blackbird", { length: samples.length, data: [samples] }, PEAK);
});
