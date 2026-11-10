import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { readWav } from "./wavFile";
import { flacSeconds, oggSeconds, soundSeconds } from "./soundLength";

test("an Ogg file lasts its last page's granule position over its sample rate, as ffprobe reads it", () => {
  expect(soundSeconds("pluck_001.ogg")).toBeCloseTo(4517 / 44100, 9);
  expect(soundSeconds("impactSoft_heavy_000.ogg")).toBeCloseTo(22275 / 44100, 9);
  expect(soundSeconds("footstep_concrete_000.ogg")).toBeCloseTo(4671 / 44100, 9);
});

test("a wav file lasts its samples over its rate", () => {
  const { rate, samples } = readWav("stairwell/relay.wav");
  expect(soundSeconds("stairwell/relay.wav")).toBeCloseTo(samples.length / rate, 9);
});

const page = (granule: bigint, last: boolean) => {
  const header = Buffer.alloc(27);
  header.write("OggS", 0, "latin1");
  header[5] = last ? 0x04 : 0x00;
  header.writeBigInt64LE(granule, 6);
  return header;
};

const identification = (rate: number) => {
  const packet = Buffer.alloc(30);
  packet.write("\x01vorbis", 0, "latin1");
  packet.writeUInt32LE(rate, 12);
  return packet;
};

test("an Ogg file's length comes from its end-of-stream page, never from 'OggS' bytes that happen to sit in the audio after it", () => {
  const file = Buffer.concat([page(BigInt(0), false), identification(44100), page(BigInt(88200), true), Buffer.from("....OggS\x00\x00\xff\xff\xff\xff\xff\xff\xff\x7f....", "latin1")]);
  expect(oggSeconds(file)).toBeCloseTo(2, 12);
});

test("a file without an Ogg end-of-stream page is refused rather than misread", () => {
  expect(() => oggSeconds(Buffer.concat([identification(44100), Buffer.from("no pages here", "latin1")]))).toThrow(/end-of-stream/);
  expect(() => oggSeconds(Buffer.concat([page(BigInt(0), false), identification(44100), page(BigInt(5), false)]))).toThrow(/end-of-stream/);
});

test("a FLAC file lasts its STREAMINFO's total samples over its sample rate, as ffprobe reads it", () => {
  expect(flacSeconds(readFileSync("public/music/mainstreet.flac"))).toBeCloseTo(144.149478, 5);
  expect(() => flacSeconds(Buffer.from("OggS not a flac file"))).toThrow(/not a FLAC file/);
});
