import { TIMELINE_FPS, atFrame, renderFrame } from "../frameRate";
import { nuancedTake } from "./takes";

export type Surface = "concrete" | "wood" | "wet";

export const footstepName = (surface: Surface, take: number) => `footstep_${surface}_00${take}`;

export const FOOTSTEP_TAKES: Readonly<Record<Surface, number>> = { concrete: 4, wood: 4, wet: 5 };

type StepTake = { readonly surface?: Surface | undefined; readonly room?: "stairwell" | undefined; readonly variant?: number };

const stepSeed = ({ surface = "concrete", variant = 0 }: StepTake) => `${surface}:${variant}`;

const footstepFile = (n: number, { surface = "concrete", room }: StepTake) => {
  const file = footstepName(surface, n);
  if (room) return `${room}/${file}.wav`;
  return surface === "concrete" ? `street/${file}.wav` : `${file}.ogg`;
};

export const footstepPlan = (times: readonly number[], fps: number, take: StepTake = {}) =>
  [...new Set(times.map(atFrame))].map((at, i) => {
    const { take: n, rate, gain } = nuancedTake(stepSeed(take), i, FOOTSTEP_TAKES[take.surface ?? "concrete"]);
    return { frame: renderFrame(at, fps), file: footstepFile(n, take), rate, gain };
  });

export const stepsOn = (times: readonly number[], surface: Surface) => ({ times, surface, files: footstepPlan(times, TIMELINE_FPS, { surface }).map((step) => step.file) });
