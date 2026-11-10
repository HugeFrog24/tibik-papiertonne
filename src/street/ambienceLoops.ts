import { breeze } from "../physics/wind";
import type { SceneAmbience } from "./sceneAmbience";

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

export const hushedVolume = (loop: StreetLoop, windTime: number, hush: number) => loopVolume(loop, windTime) * (loop.breezy ? 1 : hush);

export const streetLevel = (loop: StreetLoop, windTime: number, ambience: SceneAmbience, t: number) => hushedVolume(loop, windTime, ambience.hush(t)) * ambience.duck(t);
