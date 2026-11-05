import { readFileSync } from "node:fs";
import { readWav } from "./wavFile";

const END_OF_STREAM = 0x04;

const lastPageAt = (buffer: Buffer) => {
  for (let at = buffer.lastIndexOf("OggS", buffer.length, "latin1"); at >= 0; at = buffer.lastIndexOf("OggS", at - 1, "latin1")) {
    if (at + 14 <= buffer.length && buffer[at + 4] === 0 && (buffer[at + 5] & END_OF_STREAM) !== 0) return at;
    if (at === 0) break;
  }
  throw new Error("no Ogg end-of-stream page");
};

export const oggSeconds = (buffer: Buffer) => {
  const vorbis = buffer.indexOf("\x01vorbis", 0, "latin1");
  if (vorbis < 0) throw new Error("not an Ogg Vorbis file");
  const rate = buffer.readUInt32LE(vorbis + 12);
  return Number(buffer.readBigInt64LE(lastPageAt(buffer) + 6)) / rate;
};

export const soundSeconds = (name: string) => {
  if (name.endsWith(".ogg")) return oggSeconds(readFileSync(`public/sfx/${name}`));
  const { rate, samples } = readWav(name);
  return samples.length / rate;
};
