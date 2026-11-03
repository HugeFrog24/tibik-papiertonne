import { Audio } from "@remotion/media";
import { staticFile } from "remotion";

export const StreetAmbience: React.FC = () => (
  <>
    <Audio name="Street atmosphere" src={staticFile("sfx/street-atmosphere.wav")} loop volume={0.5} />
    <Audio name="Street traffic" src={staticFile("sfx/street-traffic.wav")} loop volume={0.6} />
  </>
);
