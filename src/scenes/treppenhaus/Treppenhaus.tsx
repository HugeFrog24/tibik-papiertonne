import { ThreeCanvas } from "@remotion/three";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { StairwellLighting } from "../../building/StairwellLighting";
import { flurSpill } from "../../building/flurSpill";
import { StairwellSet } from "../../building/StairwellSet";
import { Street } from "../../street/Street";
import { Sky } from "../../street/StreetSet";
import { Tibik } from "../../Tibik/Tibik";
import { ShotCameras } from "../../toon/ShotCameras";
import { SHOTS, storyTime } from "./cameras";
import { solveTreppenhaus } from "./solve";
import { TreppenhausSound } from "./TreppenhausSound";
import { InkPass } from "../../toon/InkPass";

const Stairwell: React.FC = () => {
  const { fps } = useVideoConfig();
  const filmTime = useCurrentFrame() / fps;
  const { tibik, tibikDoor, haustuer, tibikLever, haustuerLever, lights } =
    solveTreppenhaus(storyTime(filmTime));
  return (
    <>
      <StairwellLighting lights={lights} spill={flurSpill(tibikDoor)} />
      <Street
        haustuer={haustuer}
        haustuerLever={haustuerLever}
        windAt={filmTime}
      />
      <StairwellSet
        tibikDoor={tibikDoor}
        tibikLever={tibikLever}
        lights={lights}
      />
      <Tibik
        position={tibik.position}
        rotationY={tibik.rotationY}
        pose={tibik.pose}
        carrying={null}
      />
    </>
  );
};

export const Treppenhaus: React.FC<{ readonly ambience?: boolean }> = ({
  ambience = true,
}) => {
  const { width, height } = useVideoConfig();
  return (
    <Sky>
      <ThreeCanvas
        name="Treppenhaus – 3D"
        width={width}
        height={height}
        shadows="percentage"
        flat
      >
        <ShotCameras
          shots={SHOTS}
          camera={(shot, sinceCut) => shot.at(shot.story + sinceCut)}
        />
        <Stairwell />
        <InkPass />
      </ThreeCanvas>
      <TreppenhausSound ambience={ambience} />
    </Sky>
  );
};
