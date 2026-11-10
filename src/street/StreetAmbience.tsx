import { IndoorLoop } from "../sound/IndoorLoop";
import { STREET_LOOPS, streetLevel } from "./ambienceLoops";
import { OUT_IN_THE_STREET, type SceneAmbience } from "./sceneAmbience";

export const StreetAmbience: React.FC<{
  readonly ambience?: SceneAmbience;
  readonly windFrom?: number;
}> = ({ ambience = OUT_IN_THE_STREET, windFrom = 0 }) => (
  <>
    {STREET_LOOPS.map((loop) => (
      <IndoorLoop
        key={loop.file}
        name={loop.name}
        file={loop.file}
        level={(t) => streetLevel(loop, windFrom + t, ambience, t)}
        indoors={ambience.indoors}
      />
    ))}
  </>
);
