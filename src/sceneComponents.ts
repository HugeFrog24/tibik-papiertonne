import type React from "react";
import { Hausmuell } from "./scenes/hausmuell/Hausmuell";
import { Klingelsturm } from "./scenes/klingelsturm/Klingelsturm";
import { Nachtruhe } from "./scenes/nachtruhe/Nachtruhe";
import { Papiertonnen } from "./scenes/papiertonnen/Papiertonnen";
import { Rundschreiben } from "./scenes/rundschreiben/Rundschreiben";
import { Treppenhaus } from "./scenes/treppenhaus/Treppenhaus";
import type { SceneName } from "./timeline";

export const SCENE_COMPONENTS: Readonly<Record<SceneName, React.FC<{ readonly ambience?: boolean }>>> = {
  Treppenhaus,
  Papiertonnen,
  Hausmuell,
  Klingelsturm,
  Nachtruhe,
  Rundschreiben,
};
