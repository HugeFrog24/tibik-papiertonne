import { ambienceOf } from "../../street/sceneAmbience";
import { Vector3 } from "three";
import { kf } from "../../characters/animate";
import { FPS } from "../../frameRate";
import { footstepPlan, type Surface } from "../../sound/footsteps";
import { heardFrom } from "../../sound/perspective";
import { RAIN } from "../../sound/rain";
import type { FileCue } from "../../sound/SoundCues";
import { ENTRANCE_X, FACADE_Z } from "../../street/building";
import { entryCues } from "../entrySounds";
import { cameraAt as epilogueCameraAt } from "../rundschreiben/cameras";
import { ENTRY as EPILOGUE_ENTRY } from "../rundschreiben/choreography";
import { PULLING, PUSHING, bedroomStepTimes } from "./bedroom";
import { cameraAt, inTheBedroom } from "./cameras";
import { duskStepTimes, rainShareAt } from "./choreography";
import { CURTAIN_PULLS, DAWN, DRONE, DUSK, ENTRY, HOP_DOWN, HOP_UP, LAMP_OFF, LAMP_ON, NACHTRUHE_DURATION } from "./timeline";

export const BLACKBIRD = { name: "Blackbird", file: "blackbird", volume: 0.3 } as const;

export const RAIN_FROM = DAWN[0];

export const EPILOGUE_RAIN_START = ((Math.round(NACHTRUHE_DURATION * FPS) - Math.round(RAIN_FROM * FPS)) / FPS) % RAIN.seconds;

export const rainLevelAt = (t: number) => RAIN.volume * rainShareAt(t);

const HUSH = { times: [0, DUSK[1], LAMP_OFF, DRONE[0] + 2, DAWN[0], DAWN[1]], levels: [0.6, 0.5, 0.3, 0.12, 0.12, 1] } as const;

export const hushAt = (t: number) => kf(t, HUSH.times, HUSH.levels);

const HAUSTUER: [number, number, number] = [ENTRANCE_X, 1, FACADE_Z];
const fromTheDoor = (camera: readonly number[]) => new Vector3(...camera).distanceTo(new Vector3(...HAUSTUER));

export const HAUSTUER_FAR_OFF = heardFrom(
  fromTheDoor(cameraAt(ENTRY.sounds.opens).position),
  fromTheDoor(epilogueCameraAt(EPILOGUE_ENTRY.sounds.opens).position),
);

const STEPS = { street: { volume: 0.35, surface: "concrete" }, bedroom: { volume: 0.15, surface: "wood" } } as const;

export const STEP_VOLUME = { street: STEPS.street.volume * HAUSTUER_FAR_OFF, bedroom: STEPS.bedroom.volume };

const stepsOn = (times: readonly number[], surface: Surface, fps: number) => ({ times, surface, files: footstepPlan(times, fps, { surface }).map((step) => step.file) });

export const footstepsByPlace = (fps: number) => ({
  street: stepsOn(duskStepTimes(fps).filter((t) => !inTheBedroom(t) && t < ENTRY.indoors[0]), STEPS.street.surface, fps),
  bedroom: stepsOn(bedroomStepTimes(fps).filter(inTheBedroom), STEPS.bedroom.surface, fps),
});

const CURTAIN_SWISHES = ["cloth3.ogg", "cloth1.ogg", "cloth4.ogg"];

export const NACHTRUHE_CUES: readonly FileCue[] = [
  ...entryCues(ENTRY)
    .filter((cue) => !inTheBedroom(cue.at))
    .map((cue) => ({ ...cue, volume: cue.volume * HAUSTUER_FAR_OFF })),
  { name: "The bed creaks as he sits on it", at: HOP_UP[1], file: "creak2.ogg", volume: 0.12 },
  { name: "Fleece drawn up by his right hand", at: PULLING.right[0], file: "cloth1.ogg", volume: 0.3 },
  { name: "Fleece drawn over by his left hand", at: PULLING.left[0], file: "cloth3.ogg", volume: 0.3 },
  { name: "His lamp clicks off", at: LAMP_OFF, file: "switch_002.ogg", volume: 0.2 },
  { name: "His lamp clicks on", at: LAMP_ON, file: "switch_002.ogg", volume: 0.2 },
  { name: "Fleece pushed back by his left hand", at: PUSHING.left[0], file: "cloth4.ogg", volume: 0.3 },
  { name: "Fleece pushed back by his right hand", at: PUSHING.right[0], file: "cloth2.ogg", volume: 0.3 },
  { name: "The bed creaks as he gets up", at: HOP_DOWN[0], file: "creak3.ogg", volume: 0.12 },
  ...CURTAIN_PULLS.flatMap(([from], k) => [
    { name: `Curtain fabric swishes, pull ${k + 1}`, at: from, file: CURTAIN_SWISHES[k % CURTAIN_SWISHES.length], volume: 0.18 },
    { name: `Curtain gliders run along the rail, pull ${k + 1}`, at: from, file: "curtain-gliders.wav", volume: 0.35 },
  ]),
];

export const NACHTRUHE_AMBIENCE = ambienceOf({ indoors: (t) => (inTheBedroom(t) ? 1 : 0), hush: hushAt });
