import { ToonCanvas } from "../toon/ToonCanvas";
import { Street } from "../street/Street";
import { Sky } from "../street/StreetSet";
import { CameraRig, type Vec3 } from "../toon/primitives";
import { StairwellLighting } from "./StairwellLighting";
import { StairwellSet } from "./StairwellSet";

const VIEWS = {
  landing: {
    position: [-1.2, 4.85, -7.4] as Vec3,
    target: [-3.2, 4.2, -9.3] as Vec3,
    fov: 50,
  },
  flight: {
    position: [-1.4, 1.5, -2.9] as Vec3,
    target: [-2.6, 2.9, -7.6] as Vec3,
    fov: 55,
  },
  door: {
    position: [-1.5, 1.6, -6.0] as Vec3,
    target: [-1.9, 1.3, -2.4] as Vec3,
    fov: 50,
  },
  roomDoor: {
    position: [-4.5, 4.6, -6.45] as Vec3,
    target: [-3.83, 4.3, -6.98] as Vec3,
    fov: 45,
  },
  roomDoorInside: {
    position: [-3.5, 4.55, -6.25] as Vec3,
    target: [-3.78, 4.3, -6.98] as Vec3,
    fov: 50,
  },
};

export const StairwellSheet: React.FC<{
  readonly view?: keyof typeof VIEWS;
}> = ({ view = "flight" }) => {
  return (
    <Sky>
      <ToonCanvas>
        <CameraRig {...VIEWS[view]} />
        <StairwellLighting lights={1} />
        <Street />
        <StairwellSet tibikDoor={0} lights={1} />
      </ToonCanvas>
    </Sky>
  );
};
