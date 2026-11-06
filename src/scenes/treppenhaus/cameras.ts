import { ambienceOf } from "../../street/sceneAmbience";
import { treppenhausIndoors } from "./choreography";
import { filmTimeIn, findShot, fixed, storyTimeIn, type CameraSetup, type Shot } from "../../toon/shots";
import { STORY_END } from "./choreography";
import { aboveHisHips } from "../../Tibik/rig";
import { floorLevel } from "../../street/building";

const LAST_SHOT_FROM = 8.5;
const LAST_SHOT_STORY = 15.8;
export const TREPPENHAUS_DURATION =
  LAST_SHOT_FROM + STORY_END - LAST_SHOT_STORY;

type StoryShot = Shot & { readonly story: number };

export const SHOTS: readonly StoryShot[] = [
  {
    name: "His door",
    from: 0,
    to: 4.1,
    story: 0,
    at: fixed([-1.05, aboveHisHips(1.12, floorLevel(1)), -9.75], [-3.1, aboveHisHips(0.47, floorLevel(1)), -8.95], 52),
  },
  {
    name: "The light switch",
    from: 4.1,
    to: 5.6,
    story: 4.1,
    at: fixed([-2.55, aboveHisHips(0.87, floorLevel(1)), -7.0], [-3.05, aboveHisHips(0.52, floorLevel(1)), -8.8], 50),
  },
  {
    name: "Down the long flight",
    from: 5.6,
    to: LAST_SHOT_FROM,
    story: 5.6,
    at: fixed([-1.4, 1.5, -2.9], [-2.6, 2.9, -7.6], 55),
  },
  {
    name: "Out the front door",
    from: LAST_SHOT_FROM,
    to: TREPPENHAUS_DURATION,
    story: LAST_SHOT_STORY,
    at: fixed([-1.6, 1.6, -5.8], [-1.9, 1.3, -2.4], 50),
  },
];

const shotAt = (filmT: number) => findShot(SHOTS, filmT);

export const storyTime = storyTimeIn(SHOTS);

export const cameraAt = (filmT: number): CameraSetup =>
  shotAt(filmT).at(storyTime(filmT));

export const filmTimeOf = filmTimeIn(SHOTS);

export const TREPPENHAUS_AMBIENCE = ambienceOf({ indoors: (t) => treppenhausIndoors(storyTime(t)) });
