import { IndoorLoop } from "../sound/IndoorLoop";
import { STREET_LOOPS, hushedVolume } from "./ambienceLoops";
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
        level={(t) => hushedVolume(loop, windFrom + t, ambience.hush(t))}
        indoors={ambience.indoors}
      />
    ))}
  </>
);
