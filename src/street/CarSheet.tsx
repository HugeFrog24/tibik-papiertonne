import { ToonCanvas } from "../toon/ToonCanvas";
import { useCurrentFrame } from "remotion";
import { CameraRig } from "../toon/primitives";
import { CAR_VIEWS } from "./carViews";
import { Street } from "./Street";
import { Sky, StreetLighting } from "./StreetSet";

export const CarSheet: React.FC = () => {
  const view = CAR_VIEWS[Math.min(useCurrentFrame(), CAR_VIEWS.length - 1)];
  return (
    <Sky>
      <ToonCanvas ink={false}>
        <CameraRig {...view} />
        <StreetLighting />
        <Street />
      </ToonCanvas>
    </Sky>
  );
};
