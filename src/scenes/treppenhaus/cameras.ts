import { findShot, type CameraSetup } from "../hausmuell/cameras";
import { STORY_END } from "./choreography";

const LAST_SHOT_FROM = 8.5;
const LAST_SHOT_STORY = 15.8;
export const TREPPENHAUS_DURATION =
  LAST_SHOT_FROM + STORY_END - LAST_SHOT_STORY;

export type StoryShot = {
  readonly name: string;
  readonly from: number;
  readonly to: number;
  readonly story: number;
  readonly at: (storyT: number) => CameraSetup;
};

export const SHOTS: readonly StoryShot[] = [
  {
    name: "His door",
    from: 0,
    to: 4.1,
    story: 0,
    at: () => ({
      position: [-1.05, 4.9, -9.75],
      target: [-3.1, 4.25, -8.95],
      fov: 52,
    }),
  },
  {
    name: "The light switch",
    from: 4.1,
    to: 5.6,
    story: 4.1,
    at: () => ({
      position: [-2.55, 4.65, -7.0],
      target: [-3.05, 4.3, -8.8],
      fov: 50,
    }),
  },
  {
    name: "Down the long flight",
    from: 5.6,
    to: LAST_SHOT_FROM,
    story: 5.6,
    at: () => ({
      position: [-1.4, 1.5, -2.9],
      target: [-2.6, 2.9, -7.6],
      fov: 55,
    }),
  },
  {
    name: "Out the front door",
    from: LAST_SHOT_FROM,
    to: TREPPENHAUS_DURATION,
    story: LAST_SHOT_STORY,
    at: () => ({
      position: [-1.6, 1.6, -5.8],
      target: [-1.9, 1.3, -2.4],
      fov: 50,
    }),
  },
];

const shotAt = (filmT: number) => findShot(SHOTS, filmT);

export const storyTime = (filmT: number) => {
  const shot = shotAt(filmT);
  return shot.story + (filmT - shot.from);
};

export const cameraAt = (filmT: number): CameraSetup =>
  shotAt(filmT).at(storyTime(filmT));

export const filmTimeOf = (storyT: number): number | null => {
  const shot = SHOTS.find(
    (s) => storyT >= s.story && storyT < s.story + (s.to - s.from),
  );
  return shot ? shot.from + (storyT - shot.story) : null;
};
