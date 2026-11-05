import { ToonCanvas } from "../../toon/ToonCanvas";
import { useSeconds } from "../../useSeconds";
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

const Stairwell: React.FC = () => {
  const filmTime = useSeconds();
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
  return (
    <Sky>
      <ToonCanvas name="Treppenhaus – 3D">
        <ShotCameras
          shots={SHOTS}
          camera={(shot, sinceCut) => shot.at(shot.story + sinceCut)}
        />
        <Stairwell />
      </ToonCanvas>
      <TreppenhausSound ambience={ambience} />
    </Sky>
  );
};
