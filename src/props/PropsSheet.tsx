import { ThreeCanvas } from "@remotion/three";
import { Matrix4 } from "three";
import { useVideoConfig } from "remotion";
import { Sky, StreetLighting } from "../street/StreetSet";
import { InkPass } from "../toon/InkPass";
import { CameraRig } from "../toon/primitives";
import { Envelope } from "./Envelope";
import { KeyRing } from "./KeyRing";
import { Letter } from "./Letter";
import { A4, paperSpotsAt } from "./letterShape";

const at = (x: number, y: number, z = 0) => new Matrix4().makeTranslation(x, y, z);

export const PropsSheet: React.FC = () => {
  const { width, height } = useVideoConfig();
  return (
    <Sky weather="rain">
      <ThreeCanvas width={width} height={height} shadows="percentage" flat>
        <CameraRig position={[0.06, 0, 0.42]} target={[0.06, 0, 0]} fov={50} />
        <StreetLighting weather="rain" />
        <Letter
          matrix={at(-A4[0] / 2, -A4[1] / 2)}
          fold={1}
          spots={paperSpotsAt(10, 0)}
        />
        <Envelope matrix={at(0.12, 0.02)} flap={1.12} bow={0.005} twist={0.003} />
        <Letter matrix={at(0.13, -0.13)} fold={0} />
        <KeyRing matrix={at(0.3, -0.07, 0.01)} />
        <InkPass />
      </ThreeCanvas>
    </Sky>
  );
};
