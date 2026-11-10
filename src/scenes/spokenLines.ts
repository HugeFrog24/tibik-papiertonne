import type { Line } from "../dialogue/line";
import { LINES as HAUSMUELL } from "./hausmuell/choreography";
import { LINES as KLINGELSTURM } from "./klingelsturm/choreography";
import { LINES as PAPIERTONNEN } from "./papiertonnen/choreography";
import { LETTER_READ } from "./rundschreiben/narration";
import { LINES as RUNDSCHREIBEN } from "./rundschreiben/choreography";

export const SPOKEN: readonly { readonly key: string; readonly title: string; readonly lines: readonly Line[] }[] = [
  { key: "papiertonnen", title: "Papiertonnen", lines: PAPIERTONNEN },
  { key: "hausmuell", title: "Hausmüll", lines: HAUSMUELL },
  { key: "klingelsturm", title: "Klingelsturm", lines: KLINGELSTURM },
  { key: "rundschreiben", title: "Rundschreiben", lines: [...LETTER_READ, ...RUNDSCHREIBEN] },
];

export const ALL_SPOKEN_LINES: readonly Line[] = SPOKEN.flatMap((scene) => scene.lines);
