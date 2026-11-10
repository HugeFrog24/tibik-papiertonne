import { expect, test } from "vitest";
import { SHOTS as HAUSMUELL } from "../scenes/hausmuell/cameras";
import { SHOTS as KLINGELSTURM } from "../scenes/klingelsturm/cameras";
import { KLINGELSTURM_DURATION } from "../scenes/klingelsturm/choreography";
import { SHOTS as TREPPENHAUS } from "../scenes/treppenhaus/cameras";
import { FPS } from "../timeline";
import { shotFrames, type CutShot } from "./shotFrames";

const coverage = (shots: readonly CutShot[], frames: number) => {
  const problems: string[] = [];
  const windows = shotFrames(shots, FPS);
  for (let f = 0; f < frames; f++) {
    const on = windows.filter((w) => f >= w.from && f < w.from + w.duration);
    if (on.length !== 1)
      problems.push(
        `frame ${f}: ${on.map((w) => w.name).join(" + ") || "no camera"}`,
      );
  }
  return problems;
};

test("every frame of every scene has exactly one shot camera", () => {
  const scenes: [string, readonly CutShot[], number][] = [
    ["Klingelsturm", KLINGELSTURM, Math.round(KLINGELSTURM_DURATION * FPS)],
    [
      "Hausmuell",
      HAUSMUELL,
      Math.round(HAUSMUELL[HAUSMUELL.length - 1].to * FPS),
    ],
    [
      "Treppenhaus",
      TREPPENHAUS,
      Math.round(TREPPENHAUS[TREPPENHAUS.length - 1].to * FPS),
    ],
  ];
  for (const [name, shots, frames] of scenes)
    expect(coverage(shots, frames), name).toEqual([]);
});
