import { expect, test } from "vitest";
import { FPS, type Format } from "../frameRate";
import { shotFrames } from "../toon/shotFrames";
import { inFormat, sinceTheCut, type CameraSetup, type Shot } from "../toon/shots";
import { SHOTS as HAUSMUELL_SHOTS, cameraAt as hausmuellCamera } from "./hausmuell/cameras";
import { SHOTS as KLINGELSTURM_SHOTS, cameraAt as klingelsturmCamera } from "./klingelsturm/cameras";
import { NACHTRUHE_SHOTS } from "./nachtruhe/cameras";
import { SHOTS as PAPIERTONNEN_SHOTS, cameraAt as papiertonnenCamera } from "./papiertonnen/cameras";
import { SHOTS as RUNDSCHREIBEN_SHOTS } from "./rundschreiben/cameras";
import { SHOTS as TREPPENHAUS_SHOTS, cameraAt as treppenhausCamera, storyTime as treppenhausStory } from "./treppenhaus/cameras";

type Scene = {
  readonly name: string;
  readonly shots: readonly Shot[];
  readonly cameraAt: (t: number, format: Format) => CameraSetup;
  readonly storyOf?: (filmT: number) => number;
};

const CUT_SCENES: readonly Scene[] = [
  { name: "Hausmuell", shots: HAUSMUELL_SHOTS, cameraAt: hausmuellCamera },
  { name: "Klingelsturm", shots: KLINGELSTURM_SHOTS, cameraAt: klingelsturmCamera },
  { name: "Papiertonnen", shots: PAPIERTONNEN_SHOTS, cameraAt: papiertonnenCamera },
  { name: "Treppenhaus", shots: TREPPENHAUS_SHOTS, cameraAt: treppenhausCamera, storyOf: treppenhausStory },
];

const ALL_SHOTS: readonly (readonly [string, readonly Shot[]])[] = [
  ...CUT_SCENES.map(({ name, shots }) => [name, shots] as const),
  ["Nachtruhe", NACHTRUHE_SHOTS],
  ["Rundschreiben", RUNDSCHREIBEN_SHOTS],
];

test.each(ALL_SHOTS)("%s: every cut lands on a whole frame, so the render and the checks cut on the same frame", (_, shots) => {
  const off = shots.flatMap((shot) => [shot.from, shot.to].filter((t) => Math.abs(t * FPS - Math.round(t * FPS)) > 1e-6).map((t) => `${shot.name} ${t}`));
  expect(off).toEqual([]);
});

test.each(CUT_SCENES)("$name: the camera the render runs from each cut is the camera the checks measure, frame for frame, in both formats", ({ shots, cameraAt, storyOf }) => {
  const windows = shotFrames(shots, FPS);
  const differ: string[] = [];
  shots.forEach((shot, i) => {
    for (let k = 0; k < windows[i].duration; k++)
      for (const format of ["wide", "tall"] as const) {
        const rendered = sinceTheCut(inFormat(shot, format), k / FPS, storyOf);
        const measured = cameraAt((windows[i].from + k) / FPS, format);
        const apart = Math.max(...[...rendered.position, ...rendered.target, rendered.fov].map((v, j) => Math.abs(v - [...measured.position, ...measured.target, measured.fov][j])));
        if (apart > 1e-9) differ.push(`${shot.name} ${format} frame ${windows[i].from + k}: ${apart.toExponential(1)}`);
      }
  });
  expect(differ.slice(0, 6)).toEqual([]);
});
