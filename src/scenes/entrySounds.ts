import type { FileCue } from "../sound/SoundCues";

type Entry = {
  readonly unlock: readonly [number, number];
  readonly sounds: { readonly keyIn: number; readonly unlocked: number; readonly opens: number; readonly shut: number };
};

export const entryCues = ({ unlock, sounds }: Entry): FileCue[] => [
  { name: "Keys jingle up to the Haustür", at: unlock[0] - 0.3, file: "handleCoins.ogg", volume: 0.3 },
  { name: "House key into the cylinder", at: sounds.keyIn, file: "metalClick.ogg", volume: 0.35 },
  { name: "Haustür lock turns", at: sounds.unlocked, file: "metalClick.ogg", volume: 0.35 },
  { name: "Haustür opens", at: sounds.opens, file: "doorOpen_1.ogg", volume: 0.5 },
  { name: "Haustür swings shut on its closer", at: sounds.shut - 0.08, file: "doorClose_4.ogg", volume: 0.55 },
  { name: "Haustür latch catches", at: sounds.shut, file: "metalLatch.ogg", volume: 0.5 },
];
