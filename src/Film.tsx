import { AbsoluteFill, Series } from "remotion";
import { PAPIERTONNEN_DURATION } from "./scenes/papiertonnen/choreography";
import { Papiertonnen } from "./scenes/papiertonnen/Papiertonnen";
import { HAUSMUELL_DURATION } from "./scenes/hausmuell/choreography";
import { Hausmuell } from "./scenes/hausmuell/Hausmuell";
import { StreetAmbience } from "./street/StreetAmbience";

export const FPS = 30;
export const PAPIERTONNEN_FRAMES = Math.round(PAPIERTONNEN_DURATION * FPS);
export const HAUSMUELL_FRAMES = Math.round(HAUSMUELL_DURATION * FPS);

export const Film: React.FC = () => (
  <AbsoluteFill>
    <Series>
      <Series.Sequence name="Papiertonnen" durationInFrames={PAPIERTONNEN_FRAMES}>
        <Papiertonnen ambience={false} />
      </Series.Sequence>
      <Series.Sequence name="Hausmuell" durationInFrames={HAUSMUELL_FRAMES}>
        <Hausmuell ambience={false} />
      </Series.Sequence>
    </Series>
    <StreetAmbience />
  </AbsoluteFill>
);
