import { ToonCanvas } from "../../toon/ToonCanvas";
import { DialogueTrack } from "../../dialogue/DialogueTrack";
import { PAPIERTONNEN_FROM } from "../../timeline";
import { useSeconds } from "../../useSeconds";
import { Tibik } from "../../Tibik/Tibik";
import { Karton } from "../../street/Karton";
import { BinRow, Sky, StreetLighting } from "../../street/StreetSet";
import { PapiertonnenSound } from "./PapiertonnenSound";
import { solvePapiertonnen } from "./solve";
import { betweenTicks } from "../../physics/betweenTicks";
import { storyJumpsIn } from "../../toon/shots";
import { FOUND_KARTON_SIZE } from "../../street/kartonShape";
import { Street } from "../../street/Street";
import { StairwellSet } from "../../building/StairwellSet";
import { Fly } from "../../street/Fly";
import { SHOTS } from "./cameras";
import { ShotCameras } from "../../toon/ShotCameras";
import { FLY_COUNT, flyAt } from "./flyPaths";
import { LINES } from "./choreography";

const Characters: React.FC = () => {
  const t = useSeconds();
  const { lids, haustuer, tibik, karton } = betweenTicks(solvePapiertonnen, storyJumpsIn(SHOTS))(t);

  return (
    <>
      <Street haustuer={haustuer} windAt={PAPIERTONNEN_FROM + t} />
      <StairwellSet tibikDoor={0} lights={1} />
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
        <ShotCameras shots={SHOTS} />

        <StreetLighting />
        <Characters />
      </ToonCanvas>
      <DialogueTrack lines={LINES} />
      <PapiertonnenSound ambience={ambience} />
    </Sky>
  );
};
