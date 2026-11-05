import { expect, test } from "vitest";
import { readWav } from "./wavFile";
import { soundSeconds } from "./soundLength";

test("an Ogg file lasts its last page's granule position over its sample rate, as ffprobe reads it", () => {
  expect(soundSeconds("pluck_001.ogg")).toBeCloseTo(4517 / 44100, 9);
  expect(soundSeconds("impactSoft_heavy_000.ogg")).toBeCloseTo(22275 / 44100, 9);
  expect(soundSeconds("footstep_concrete_000.ogg")).toBeCloseTo(4671 / 44100, 9);
});

test("a wav file lasts its samples over its rate", () => {
  const { rate, samples } = readWav("stairwell/relay.wav");
  expect(soundSeconds("stairwell/relay.wav")).toBeCloseTo(samples.length / rate, 9);
});
