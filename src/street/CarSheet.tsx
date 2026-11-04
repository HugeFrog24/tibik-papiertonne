import { ThreeCanvas } from "@remotion/three";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { CameraRig } from "../toon/primitives";
import { CAR_VIEWS } from "./carViews";
import { Street } from "./Street";
import { Sky, StreetLighting } from "./StreetSet";

export const CarSheet: React.FC = () => {
  const { width, height } = useVideoConfig();
  const view = CAR_VIEWS[Math.min(useCurrentFrame(), CAR_VIEWS.length - 1)];
  return (
    <Sky>
      <ThreeCanvas width={width} height={height} shadows="percentage" flat>
        <CameraRig {...view} />
        <StreetLighting />
        <Street />
      </ThreeCanvas>
    </Sky>
  );
};
