import { ambienceOf } from "../../street/sceneAmbience";
import { LEAVING, tibikAt, treppenhausIndoors } from "./choreography";
import { onFrames, camerasOf, filmTimeIn, fixed, following, storyTimeIn, type Shot } from "../../toon/shots";
import { lerpVec3 } from "../../characters/scalar";
import { TIBIK_LIGHT_BUTTON, buttonSolid } from "../../building/stairwell";
import { kf } from "../../characters/animate";
import type { Vec3 } from "../../toon/primitives";
import { STORY_END } from "./choreography";
import { aboveHisHips } from "../../Tibik/rig";
import { floorLevel } from "../../street/building";

const LAST_SHOT_FROM = 8.5;
const LAST_SHOT_STORY = 15.8;
export const TREPPENHAUS_DURATION =
  LAST_SHOT_FROM + STORY_END - LAST_SHOT_STORY;

type StoryShot = Shot & { readonly story: number };

const HIS_SPOT = (t: number) => tibikAt(t).position;

const AT_THE_SWITCH_EYE: Vec3 = [-2.55, aboveHisHips(0.87, floorLevel(1)), -7.0];
const THE_BUTTON = (): Vec3 => buttonSolid(TIBIK_LIGHT_BUTTON).center.toArray();
const PRESSING = { lead: 0.4, toward: 0.5 };
const pressing = (t: number) => {
  const { reach, done } = LEAVING.buttonHold;
  return PRESSING.toward * kf(t, [reach - PRESSING.lead, reach, done, done + PRESSING.lead], [0, 1, 1, 0]);
};
const HIM_AND_THE_BUTTON = (t: number) => lerpVec3(HIS_SPOT(t), THE_BUTTON(), pressing(t));

export const SHOTS: readonly StoryShot[] = onFrames([
  {
    name: "His door",
    from: 0,
    to: 3.5,
    story: 0,
    at: fixed([-1.05, aboveHisHips(1.12, floorLevel(1)), -9.75], [-3.1, aboveHisHips(0.47, floorLevel(1)), -8.95], 52),
  },
  {
    name: "The light switch",
    from: 3.5,
    to: 5.6,
    story: 3.5,
    ...following(fixed(AT_THE_SWITCH_EYE, [-3.05, aboveHisHips(0.52, floorLevel(1)), -8.8], 50), HIM_AND_THE_BUTTON),
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
    ...following(fixed([-1.6, 1.6, -5.8], [-1.9, 1.3, -2.4], 50), HIS_SPOT),
  },
]);

export const storyTime = storyTimeIn(SHOTS);

export const { cameraAt } = camerasOf(SHOTS, storyTime);

export const filmTimeOf = filmTimeIn(SHOTS);

export const TREPPENHAUS_AMBIENCE = ambienceOf({ indoors: (t) => treppenhausIndoors(storyTime(t)) });
