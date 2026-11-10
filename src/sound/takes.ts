import { random } from "remotion";
import { decibelGain, plusMinus } from "../characters/scalar";

export const takeAt = (seed: string, index: number, takes: number): number => {
  if (takes <= 1) return 0;
  let take = -1;
  for (let i = 0; i <= index; i++) {
    const pick = Math.floor(random(`${seed}-${i}`) * (take < 0 ? takes : takes - 1));
    take = take >= 0 && pick >= take ? pick + 1 : pick;
  }
  return take;
};

const NUANCE = { pitch: 0.03, decibels: 1 };

export const nuanceAt = (seed: string, index: number) => ({
  rate: 1 + plusMinus(`${seed}-pitch-${index}`) * NUANCE.pitch,
  gain: decibelGain(plusMinus(`${seed}-level-${index}`) * NUANCE.decibels),
});

export const nuancedTake = (seed: string, index: number, takes: number) => ({ take: takeAt(seed, index, takes), ...nuanceAt(seed, index) });
