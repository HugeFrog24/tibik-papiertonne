import { HAUSMUELL_DURATION } from "./scenes/hausmuell/choreography";
import { KLINGELSTURM_DURATION } from "./scenes/klingelsturm/choreography";
import { KLINGELSTURM_AMBIENCE } from "./scenes/klingelsturm/doorCues";
import { NACHTRUHE_AMBIENCE } from "./scenes/nachtruhe/soundCues";
import { NACHTRUHE_DURATION } from "./scenes/nachtruhe/timeline";
import { PAPIERTONNEN_DURATION } from "./scenes/papiertonnen/choreography";
import { RUNDSCHREIBEN_DURATION } from "./scenes/rundschreiben/choreography";
import { RUNDSCHREIBEN_AMBIENCE } from "./scenes/rundschreiben/soundCues";
import { TREPPENHAUS_AMBIENCE, TREPPENHAUS_DURATION } from "./scenes/treppenhaus/cameras";
import { OUT_IN_THE_STREET, type SceneAmbience } from "./street/sceneAmbience";

export { FPS } from "./frameRate";
import { FPS } from "./frameRate";
export const TREPPENHAUS_FRAMES = Math.round(TREPPENHAUS_DURATION * FPS);
export const PAPIERTONNEN_FRAMES = Math.round(PAPIERTONNEN_DURATION * FPS);
export const HAUSMUELL_FRAMES = Math.round(HAUSMUELL_DURATION * FPS);
export const KLINGELSTURM_FRAMES = Math.round(KLINGELSTURM_DURATION * FPS);
export const NACHTRUHE_FRAMES = Math.round(NACHTRUHE_DURATION * FPS);
export const RUNDSCHREIBEN_FRAMES = Math.round(RUNDSCHREIBEN_DURATION * FPS);
export const SCENES: readonly { readonly name: string; readonly frames: number; readonly ambience: SceneAmbience }[] = [
  { name: "Treppenhaus", frames: TREPPENHAUS_FRAMES, ambience: TREPPENHAUS_AMBIENCE },
  { name: "Papiertonnen", frames: PAPIERTONNEN_FRAMES, ambience: OUT_IN_THE_STREET },
  { name: "Hausmuell", frames: HAUSMUELL_FRAMES, ambience: OUT_IN_THE_STREET },
  { name: "Klingelsturm", frames: KLINGELSTURM_FRAMES, ambience: KLINGELSTURM_AMBIENCE },
  { name: "Nachtruhe", frames: NACHTRUHE_FRAMES, ambience: NACHTRUHE_AMBIENCE },
  { name: "Rundschreiben", frames: RUNDSCHREIBEN_FRAMES, ambience: RUNDSCHREIBEN_AMBIENCE },
];
const SCENE_FRAMES = SCENES.map((scene) => scene.frames);
const startFrame = (scene: number) => SCENE_FRAMES.slice(0, scene).reduce((sum, frames) => sum + frames, 0);
export const FILM_FRAMES = startFrame(SCENE_FRAMES.length);
export const PAPIERTONNEN_FROM = startFrame(1) / FPS;
export const HAUSMUELL_FROM = startFrame(2) / FPS;
export const KLINGELSTURM_FROM = startFrame(3) / FPS;
export const NACHTRUHE_FROM = startFrame(4) / FPS;
export const RUNDSCHREIBEN_FROM = startFrame(5) / FPS;

export const TIME_JUMPS: readonly {
  readonly from: string;
  readonly to: string;
}[] = [
  { from: "Hausmuell", to: "Klingelsturm" },
  { from: "Klingelsturm", to: "Nachtruhe" },
  { from: "Nachtruhe", to: "Rundschreiben" },
];

const sceneAtFrame = (frame: number) => {
  let start = 0;
  for (const scene of SCENES) {
    if (frame < start + scene.frames) return { scene, start };
    start += scene.frames;
  }
  return { scene: SCENES[SCENES.length - 1], start: start - SCENES[SCENES.length - 1].frames };
};

const heardInTheFilm = (pick: (ambience: SceneAmbience) => (t: number) => number) => (frame: number) => {
  const { scene, start } = sceneAtFrame(frame);
  return pick(scene.ambience)((frame - start) / FPS);
};

export const filmIndoors = heardInTheFilm((a) => a.indoors);

export const filmHush = heardInTheFilm((a) => a.hush);

export const FILM_AMBIENCE: SceneAmbience = {
  indoors: (t) => filmIndoors(Math.round(t * FPS)),
  hush: (t) => filmHush(Math.round(t * FPS)),
};
