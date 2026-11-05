import { HAUSMUELL_DURATION } from "./scenes/hausmuell/choreography";
import { KLINGELSTURM_DURATION } from "./scenes/klingelsturm/choreography";
import { shotAt as nachtruheShotAt } from "./scenes/nachtruhe/cameras";
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
export const FILM_FRAMES =
  TREPPENHAUS_FRAMES +
  PAPIERTONNEN_FRAMES +
  HAUSMUELL_FRAMES +
  KLINGELSTURM_FRAMES +
  NACHTRUHE_FRAMES +
  RUNDSCHREIBEN_FRAMES;
export const PAPIERTONNEN_FROM = TREPPENHAUS_FRAMES / FPS;
export const HAUSMUELL_FROM = (TREPPENHAUS_FRAMES + PAPIERTONNEN_FRAMES) / FPS;
export const KLINGELSTURM_FROM =
  (TREPPENHAUS_FRAMES + PAPIERTONNEN_FRAMES + HAUSMUELL_FRAMES) / FPS;
export const NACHTRUHE_FROM =
  (TREPPENHAUS_FRAMES + PAPIERTONNEN_FRAMES + HAUSMUELL_FRAMES + KLINGELSTURM_FRAMES) / FPS;
export const RUNDSCHREIBEN_FROM =
  (TREPPENHAUS_FRAMES + PAPIERTONNEN_FRAMES + HAUSMUELL_FRAMES + KLINGELSTURM_FRAMES + NACHTRUHE_FRAMES) / FPS;

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

const RUNDSCHREIBEN_START = Math.round(RUNDSCHREIBEN_FROM * FPS);
const NACHTRUHE_START = Math.round(NACHTRUHE_FROM * FPS);

export const nachtruheIndoorsAt = (t: number) => (nachtruheShotAt(t).name.startsWith("Bedroom") ? 1 : 0);

export const filmIndoors = (frame: number) =>
  frame < TREPPENHAUS_FRAMES
    ? treppenhausIndoorsAt(frame)
    : frame >= RUNDSCHREIBEN_START
      ? heardIndoorsAt((frame - RUNDSCHREIBEN_START) / FPS)
      : frame >= NACHTRUHE_START
        ? nachtruheIndoorsAt((frame - NACHTRUHE_START) / FPS)
        : frame >= Math.round(KLINGELSTURM_FROM * FPS)
          ? 1
          : 0;
