import { HAUSMUELL_DURATION } from "./scenes/hausmuell/choreography";
import { KLINGELSTURM_DURATION } from "./scenes/klingelsturm/choreography";
import { KLINGELSTURM_AMBIENCES } from "./scenes/klingelsturm/doorCues";
import { KLINGELSTURM_CLOCKS } from "./scenes/klingelsturm/hold";
import { byLanguage, type Language } from "./language";
import { NACHTRUHE_AMBIENCE } from "./scenes/nachtruhe/soundCues";
import { NACHTRUHE_DURATION, NACHTRUHE_FILM_JOINS } from "./scenes/nachtruhe/timeline";
import { PAPIERTONNEN_DURATION } from "./scenes/papiertonnen/choreography";
import { RUNDSCHREIBEN_DURATION } from "./scenes/rundschreiben/choreography";
import { RUNDSCHREIBEN_AMBIENCES } from "./scenes/rundschreiben/soundCues";
import { TREPPENHAUS_AMBIENCE, TREPPENHAUS_DURATION } from "./scenes/treppenhaus/cameras";
import type { SceneAmbience } from "./street/sceneAmbience";
import { PAPIERTONNEN_AMBIENCES } from "./scenes/papiertonnen/soundCues";
import { HAUSMUELL_AMBIENCES } from "./scenes/hausmuell/soundCues";

export { TIMELINE_FPS } from "./frameRate";
import { TIMELINE_FPS } from "./frameRate";
export const TREPPENHAUS_FRAMES = Math.round(TREPPENHAUS_DURATION * TIMELINE_FPS);
export const PAPIERTONNEN_FRAMES = Math.round(PAPIERTONNEN_DURATION * TIMELINE_FPS);
export const HAUSMUELL_FRAMES = Math.round(HAUSMUELL_DURATION * TIMELINE_FPS);
export const KLINGELSTURM_FRAMES = Math.round(KLINGELSTURM_DURATION * TIMELINE_FPS);
export const NACHTRUHE_FRAMES = Math.round(NACHTRUHE_DURATION * TIMELINE_FPS);
export const NACHTRUHE_FILM_FRAMES = Math.round((NACHTRUHE_DURATION - NACHTRUHE_FILM_JOINS) * TIMELINE_FPS);
export const RUNDSCHREIBEN_FRAMES = Math.round(RUNDSCHREIBEN_DURATION * TIMELINE_FPS);
export type SceneName = "Treppenhaus" | "Papiertonnen" | "Hausmuell" | "Klingelsturm" | "Nachtruhe" | "Rundschreiben";
export type FilmScene = { readonly name: SceneName; readonly frames: number; readonly ambience: SceneAmbience; readonly skip?: number | undefined };
export const FILM_SCENES: Readonly<Record<Language, readonly FilmScene[]>> = byLanguage((language) => [
  { name: "Treppenhaus", frames: TREPPENHAUS_FRAMES, ambience: TREPPENHAUS_AMBIENCE },
  { name: "Papiertonnen", frames: PAPIERTONNEN_FRAMES, ambience: PAPIERTONNEN_AMBIENCES[language] },
  { name: "Hausmuell", frames: HAUSMUELL_FRAMES, ambience: HAUSMUELL_AMBIENCES[language] },
  { name: "Klingelsturm", frames: KLINGELSTURM_FRAMES + KLINGELSTURM_CLOCKS[language].frames, ambience: KLINGELSTURM_AMBIENCES[language] },
  { name: "Nachtruhe", frames: NACHTRUHE_FILM_FRAMES, ambience: NACHTRUHE_AMBIENCE, skip: NACHTRUHE_FILM_JOINS },
  { name: "Rundschreiben", frames: RUNDSCHREIBEN_FRAMES, ambience: RUNDSCHREIBEN_AMBIENCES[language] },
]);
export const SCENES: readonly FilmScene[] = FILM_SCENES.de;
export const wholeFrames = (scene: FilmScene) => scene.frames + Math.round((scene.skip ?? 0) * TIMELINE_FPS);
const startsOf = (scenes: readonly FilmScene[]) => scenes.map((_, i) => scenes.slice(0, i).reduce((sum, scene) => sum + scene.frames, 0));
export const filmStartsIn = (language: Language) => startsOf(FILM_SCENES[language]);
export const filmFramesIn = (language: Language) => FILM_SCENES[language].reduce((sum, scene) => sum + scene.frames, 0);
const startFrame = (scene: number) => filmStartsIn("de")[scene];
export const FILM_FRAMES = filmFramesIn("de");
export const PAPIERTONNEN_FROM = startFrame(1) / TIMELINE_FPS;
export const HAUSMUELL_FROM = startFrame(2) / TIMELINE_FPS;
export const KLINGELSTURM_FROM = startFrame(3) / TIMELINE_FPS;
export const NACHTRUHE_FROM = startFrame(4) / TIMELINE_FPS;
export const NACHTRUHE_STORY_ZERO = NACHTRUHE_FROM - NACHTRUHE_FILM_JOINS;
export const RUNDSCHREIBEN_FROM = startFrame(5) / TIMELINE_FPS;

export const TIME_JUMPS: readonly {
  readonly from: string;
  readonly to: string;
}[] = [
  { from: "Hausmuell", to: "Klingelsturm" },
  { from: "Klingelsturm", to: "Nachtruhe" },
  { from: "Nachtruhe", to: "Rundschreiben" },
];

const sceneAtFrame = (scenes: readonly FilmScene[]) => (frame: number) => {
  let start = 0;
  for (const scene of scenes) {
    if (frame < start + scene.frames) return { scene, start };
    start += scene.frames;
  }
  return { scene: scenes[scenes.length - 1], start: start - scenes[scenes.length - 1].frames };
};

const heardInTheFilm = (scenes: readonly FilmScene[], pick: (ambience: SceneAmbience) => (t: number) => number) => (frame: number) => {
  const { scene, start } = sceneAtFrame(scenes)(frame);
  return pick(scene.ambience)((frame - start) / TIMELINE_FPS + (scene.skip ?? 0));
};

const FILM_AMBIENCES = byLanguage((language): SceneAmbience => {
  const [indoors, hush, duck] = [heardInTheFilm(FILM_SCENES[language], (a) => a.indoors), heardInTheFilm(FILM_SCENES[language], (a) => a.hush), heardInTheFilm(FILM_SCENES[language], (a) => a.duck)];
  return {
    indoors: (t) => indoors(Math.round(t * TIMELINE_FPS)),
    hush: (t) => hush(Math.round(t * TIMELINE_FPS)),
    duck: (t) => duck(Math.round(t * TIMELINE_FPS)),
  };
});

export const filmAmbienceIn = (language: Language) => FILM_AMBIENCES[language];

export const filmIndoors = heardInTheFilm(SCENES, (a) => a.indoors);

export const filmHush = heardInTheFilm(SCENES, (a) => a.hush);

export const filmDuck = heardInTheFilm(SCENES, (a) => a.duck);

export const FILM_AMBIENCE: SceneAmbience = FILM_AMBIENCES.de;
