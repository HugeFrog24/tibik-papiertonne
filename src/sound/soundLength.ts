import { readFileSync } from "node:fs";
import { readWav } from "./wavFile";

const oggSeconds = (buffer: Buffer) => {
  const vorbis = buffer.indexOf("\x01vorbis", 0, "latin1");
  if (vorbis < 0) throw new Error("not an Ogg Vorbis file");
  const rate = buffer.readUInt32LE(vorbis + 12);
  const lastPage = buffer.lastIndexOf("OggS", buffer.length, "latin1");
  return Number(buffer.readBigInt64LE(lastPage + 6)) / rate;
};

export const soundSeconds = (name: string) => {
  if (name.endsWith(".ogg")) return oggSeconds(readFileSync(`public/sfx/${name}`));
  const { rate, samples } = readWav(name);
  return samples.length / rate;
};
