import { HAUSMUELL_DURATION } from "./scenes/hausmuell/choreography";
import { KLINGELSTURM_DURATION } from "./scenes/klingelsturm/choreography";
import { PAPIERTONNEN_DURATION } from "./scenes/papiertonnen/choreography";
import { TREPPENHAUS_DURATION, storyTime } from "./scenes/treppenhaus/cameras";
import { treppenhausIndoors } from "./scenes/treppenhaus/choreography";

export { FPS } from "./frameRate";
import { FPS } from "./frameRate";
export const TREPPENHAUS_FRAMES = Math.round(TREPPENHAUS_DURATION * FPS);
export const PAPIERTONNEN_FRAMES = Math.round(PAPIERTONNEN_DURATION * FPS);
export const HAUSMUELL_FRAMES = Math.round(HAUSMUELL_DURATION * FPS);
export const KLINGELSTURM_FRAMES = Math.round(KLINGELSTURM_DURATION * FPS);
export const FILM_FRAMES =
  TREPPENHAUS_FRAMES +
  PAPIERTONNEN_FRAMES +
  HAUSMUELL_FRAMES +
  KLINGELSTURM_FRAMES;
export const PAPIERTONNEN_FROM = TREPPENHAUS_FRAMES / FPS;
export const HAUSMUELL_FROM = (TREPPENHAUS_FRAMES + PAPIERTONNEN_FRAMES) / FPS;
export const KLINGELSTURM_FROM =
  (TREPPENHAUS_FRAMES + PAPIERTONNEN_FRAMES + HAUSMUELL_FRAMES) / FPS;

export const TIME_JUMPS: readonly {
  readonly from: string;
  readonly to: string;
}[] = [{ from: "Hausmuell", to: "Klingelsturm" }];

export const treppenhausIndoorsAt = (frame: number) =>
  treppenhausIndoors(storyTime(frame / FPS));

export const filmIndoors = (frame: number) =>
  frame < TREPPENHAUS_FRAMES
    ? treppenhausIndoorsAt(frame)
    : frame >= Math.round(KLINGELSTURM_FROM * FPS)
      ? 1
      : 0;
