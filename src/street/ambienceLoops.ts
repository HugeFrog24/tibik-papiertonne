import { breeze } from "../physics/wind";

export const STREET_LOOPS = [
  {
    name: "Street atmosphere",
    file: "street-atmosphere",
    volume: 0.5,
    breezy: false,
  },
  {
    name: "Street traffic",
    file: "street-traffic",
    volume: 0.6,
    breezy: false,
  },
  {
    name: "Leaves in the breeze",
    file: "street-leaves",
    volume: 0.45,
    breezy: true,
  },
  {
    name: "Wood pigeons",
    file: "street-pigeons",
    volume: 0.4,
    breezy: false,
  },
] as const;

export type StreetLoop = (typeof STREET_LOOPS)[number];

export const rustle = (t: number) => Math.min(1, Math.max(0, breeze(t))) ** 1.5;

export const loopVolume = (loop: StreetLoop, windTime: number) =>
  loop.volume * (loop.breezy ? rustle(windTime) : 1);
