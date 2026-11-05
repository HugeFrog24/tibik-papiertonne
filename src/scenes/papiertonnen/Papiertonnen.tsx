import { ToonCanvas } from "../../toon/ToonCanvas";
import { PAPIERTONNEN_FROM } from "../../timeline";
import { Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { Tibik } from "../../Tibik/Tibik";
import { CameraRig } from "../../toon/primitives";
import { Karton } from "../../street/Karton";
import { BinRow, Sky, StreetLighting } from "../../street/StreetSet";
import { PapiertonnenSound } from "./PapiertonnenSound";
import { solvePapiertonnen } from "./solve";
import { FOUND_KARTON_SIZE } from "../../street/kartonShape";
import { Street } from "../../street/Street";
import { StairwellSet } from "../../building/StairwellSet";
import { Fly } from "../../street/Fly";
import { SHOTS } from "./cameras";
import type { Shot } from "../hausmuell/cameras";
import { FLY_COUNT, flyAt } from "./flyPaths";

const ShotCamera: React.FC<{ readonly shot: Shot }> = ({ shot }) => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  return <CameraRig {...shot.at(shot.from + t)} />;
};

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
  const { fps } = useVideoConfig();

  return (
    <Sky>
      <ToonCanvas name="Papiertonnen – 3D">
        {SHOTS.map((shot) => (
          <Sequence
            key={shot.name}
            name={shot.name}
            layout="none"
            from={Math.round(shot.from * fps)}
            durationInFrames={Math.round((shot.to - shot.from) * fps)}
          >
            <ShotCamera shot={shot} />
          </Sequence>
        ))}

        <StreetLighting />
        <Characters />
      </ToonCanvas>
      <PapiertonnenSound ambience={ambience} />
    </Sky>
  );
};
