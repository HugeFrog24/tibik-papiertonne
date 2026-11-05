import { HAUSMUELL_DURATION } from "./scenes/hausmuell/choreography";
import { KLINGELSTURM_DURATION } from "./scenes/klingelsturm/choreography";
import { inTheBedroom } from "./scenes/nachtruhe/cameras";
import { NACHTRUHE_DURATION } from "./scenes/nachtruhe/timeline";
import { PAPIERTONNEN_DURATION } from "./scenes/papiertonnen/choreography";
import { RUNDSCHREIBEN_DURATION } from "./scenes/rundschreiben/choreography";
import { heardIndoorsAt } from "./scenes/rundschreiben/soundCues";
import { TREPPENHAUS_DURATION, storyTime } from "./scenes/treppenhaus/cameras";
import { treppenhausIndoors } from "./scenes/treppenhaus/choreography";

export { FPS } from "./frameRate";
import { FPS } from "./frameRate";
export const TREPPENHAUS_FRAMES = Math.round(TREPPENHAUS_DURATION * FPS);
export const PAPIERTONNEN_FRAMES = Math.round(PAPIERTONNEN_DURATION * FPS);
export const HAUSMUELL_FRAMES = Math.round(HAUSMUELL_DURATION * FPS);
export const KLINGELSTURM_FRAMES = Math.round(KLINGELSTURM_DURATION * FPS);
export const NACHTRUHE_FRAMES = Math.round(NACHTRUHE_DURATION * FPS);
export const RUNDSCHREIBEN_FRAMES = Math.round(RUNDSCHREIBEN_DURATION * FPS);
const SCENE_FRAMES = [TREPPENHAUS_FRAMES, PAPIERTONNEN_FRAMES, HAUSMUELL_FRAMES, KLINGELSTURM_FRAMES, NACHTRUHE_FRAMES, RUNDSCHREIBEN_FRAMES];
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

export const treppenhausIndoorsAt = (frame: number) =>
  treppenhausIndoors(storyTime(frame / FPS));

const KLINGELSTURM_START = startFrame(3);
const NACHTRUHE_START = startFrame(4);
const RUNDSCHREIBEN_START = startFrame(5);

export const nachtruheIndoorsAt = (t: number) => (inTheBedroom(t) ? 1 : 0);

export const filmIndoors = (frame: number) =>
  frame < TREPPENHAUS_FRAMES
    ? treppenhausIndoorsAt(frame)
    : frame >= RUNDSCHREIBEN_START
      ? heardIndoorsAt((frame - RUNDSCHREIBEN_START) / FPS)
      : frame >= NACHTRUHE_START
        ? nachtruheIndoorsAt((frame - NACHTRUHE_START) / FPS)
        : frame >= KLINGELSTURM_START
          ? 1
          : 0;
