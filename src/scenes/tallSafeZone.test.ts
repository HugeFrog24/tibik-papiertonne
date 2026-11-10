import { expect, test } from "vitest";
import { faceInWorld } from "../dialogue/screen";
import type { Line } from "../dialogue/line";
import type { Format } from "../frameRate";
import { KAREN_SKELETON } from "../Karen/rig";
import { RIG } from "../Tibik/rig";
import type { CameraSetup } from "../toon/shots";
import { LINES as HAUSMUELL_LINES } from "./hausmuell/choreography";
import { cameraAt as hausmuellCamera } from "./hausmuell/cameras";
import { solveHausmuell } from "./hausmuell/solve";
import { LINES as KLINGELSTURM_LINES } from "./klingelsturm/choreography";
import { cameraAt as klingelsturmCamera } from "./klingelsturm/cameras";
import { solveKlingelsturm } from "./klingelsturm/solve";
import { LINES as RUNDSCHREIBEN_LINES } from "./rundschreiben/choreography";
import { cameraAt as rundschreibenCamera } from "./rundschreiben/cameras";
import { solveRundschreiben } from "./rundschreiben/solve";
import { speakerEyesInTheTopBand, type SpeakerFaces } from "./sceneChecks";

type Scene = {
  readonly name: string;
  readonly lines: readonly Line[];
  readonly cameraAt: (t: number, format: Format) => CameraSetup;
  readonly facesAt: (t: number) => SpeakerFaces;
};

const SCENES: readonly Scene[] = [
  {
    name: "Hausmuell",
    lines: HAUSMUELL_LINES,
    cameraAt: hausmuellCamera,
    facesAt: (t) => {
      const { tibik, karen } = solveHausmuell(t);
      return { tibik: faceInWorld(RIG, tibik), karen: faceInWorld(KAREN_SKELETON, karen) };
    },
  },
  {
    name: "Klingelsturm",
    lines: KLINGELSTURM_LINES,
    cameraAt: klingelsturmCamera,
    facesAt: (t) => {
      const { tibik, karen, tibikHere } = solveKlingelsturm(t);
      return { karen: faceInWorld(KAREN_SKELETON, karen), ...(tibikHere ? { tibik: faceInWorld(RIG, tibik) } : {}) };
    },
  },
  {
    name: "Rundschreiben",
    lines: RUNDSCHREIBEN_LINES,
    cameraAt: rundschreibenCamera,
    facesAt: (t) => ({ tibik: faceInWorld(RIG, solveRundschreiben(t).tibik) }),
  },
];

test.each(SCENES)("$name: in 9:16 no speaker's eyes sit in the top band where Shorts, Reels and TikTok draw their own buttons", { timeout: 300_000 }, ({ lines, cameraAt, facesAt }) => {
  expect(speakerEyesInTheTopBand(lines, (t) => cameraAt(t, "tall"), facesAt)).toEqual([]);
});
