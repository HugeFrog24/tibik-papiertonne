import type { Line } from "../dialogue/line";
import { LINES as HAUSMUELL } from "./hausmuell/choreography";
import { LINES as KLINGELSTURM } from "./klingelsturm/choreography";
import { LINES as PAPIERTONNEN } from "./papiertonnen/choreography";
import { RUNDSCHREIBEN_SPOKEN } from "./rundschreiben/narration";

export const SPOKEN: readonly { readonly key: string; readonly title: string; readonly lines: readonly Line[] }[] = [
  { key: "papiertonnen", title: "Papiertonnen", lines: PAPIERTONNEN },
  { key: "hausmuell", title: "Hausmüll", lines: HAUSMUELL },
  { key: "klingelsturm", title: "Klingelsturm", lines: KLINGELSTURM },
  { key: "rundschreiben", title: "Rundschreiben", lines: RUNDSCHREIBEN_SPOKEN },
];

export const ALL_SPOKEN_LINES: readonly Line[] = SPOKEN.flatMap((scene) => scene.lines);
