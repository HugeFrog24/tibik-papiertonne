import { ToonCanvas } from "../../toon/ToonCanvas";
import { PAPIERTONNEN_FROM } from "../../timeline";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Tibik } from "../../Tibik/Tibik";
import { Karton } from "../../street/Karton";
import { BinRow, Sky, StreetLighting } from "../../street/StreetSet";
import { PapiertonnenSound } from "./PapiertonnenSound";
import { solvePapiertonnen } from "./solve";
import { FOUND_KARTON_SIZE } from "../../street/kartonShape";
import { Street } from "../../street/Street";
import { StairwellSet } from "../../building/StairwellSet";
import { Fly } from "../../street/Fly";
import { SHOTS } from "./cameras";
import { ShotCameras } from "../../toon/ShotCameras";
import { FLY_COUNT, flyAt } from "./flyPaths";

const Characters: React.FC = () => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const { lids, haustuer, tibik, karton } = solvePapiertonnen(t);

  return (
    <>
      <Street haustuer={haustuer} windAt={PAPIERTONNEN_FROM + t} />
      {haustuer > 0 ? <StairwellSet tibikDoor={0} lights={1} /> : null}
      <BinRow lids={lids} boxTaken={karton !== null} />
      {Array.from({ length: FLY_COUNT }, (_, i) => (
        <Fly key={i} {...flyAt(i, t)} />
      ))}
      <Tibik
        position={tibik.position}
        rotationY={tibik.rotationY}
        pose={tibik.pose}
        carrying={
          karton ? (
            <Karton
              position={karton.position}
              rotation={karton.rotation}
              open={karton.open}
              size={FOUND_KARTON_SIZE}
            />
          ) : null
        }
      />
    </>
  );
};

export const Papiertonnen: React.FC<{
  readonly ambience?: boolean;
}> = ({ ambience = true }) => {
  return (
    <Sky>
      <ToonCanvas name="Papiertonnen – 3D">
        <ShotCameras
          shots={SHOTS}
          camera={(shot, sinceCut) => shot.at(shot.from + sinceCut)}
        />

        <StreetLighting />
        <Characters />
      </ToonCanvas>
      <PapiertonnenSound ambience={ambience} />
    </Sky>
  );
};
