import { ToonCanvas } from "../../toon/ToonCanvas";
import { HAUSMUELL_FROM } from "../../timeline";
import { Track } from "remotion";
import { useSeconds } from "../../useSeconds";
import { DialogueTrack } from "../../dialogue/DialogueTrack";
import { Karen } from "../../Karen/Karen";
import { SprayView } from "../../Karen/SprayView";
import { FOUND_KARTON_SIZE } from "../../street/kartonShape";
import { Karton } from "../../street/Karton";
import { Street } from "../../street/Street";
import { BinRow, Sky, StreetLighting } from "../../street/StreetSet";
import { Tibik } from "../../Tibik/Tibik";
import { ShotCameras } from "../../toon/ShotCameras";
import { SHOTS } from "./cameras";
import { LINES } from "./choreography";
import { HausmuellSound } from "./HausmuellSound";
import { solveHausmuell } from "./solve";
import { hausmuellSprayAt } from "./spray";
import { mouthOnScreen } from "./speakers";

const Characters: React.FC = () => {
  const t = useSeconds();
  const { lids, tibik, karton, karen } = solveHausmuell(t);
  return (
    <>
      <BinRow lids={lids} boxTaken />
      <Tibik
        position={tibik.position}
        rotationY={tibik.rotationY}
        pose={tibik.pose}
        carrying={
          <Karton
            position={karton.position}
            rotation={karton.rotation}
            open={karton.open}
            size={FOUND_KARTON_SIZE}
          />
        }
      />
      <Karen
        position={karen.position}
        rotationY={karen.rotationY}
        pose={karen.pose}
        mouthOpen={karen.mouthOpen}
        pointing={karen.pointing}
        windAt={HAUSMUELL_FROM + t}
      />
      <SprayView frame={hausmuellSprayAt(t)} />
    </>
  );
};

export const Hausmuell: React.FC<{
  readonly ambience?: boolean;
}> = ({ ambience = true }) => {
  const t = useSeconds();

  return (
    <Sky>
      <ToonCanvas name="Hausmuell – 3D">
        <ShotCameras
          shots={SHOTS}
          camera={(shot, sinceCut) => shot.at(shot.from + sinceCut)}
        />
        <StreetLighting />
        <Street windAt={HAUSMUELL_FROM + t} />
        <Characters />
      </ToonCanvas>

      <Track name="Dialogue">
        <DialogueTrack
          lines={LINES}
          tailTo={(line, at) =>
            line.speaker === "phone" ? null : mouthOnScreen(at, line.speaker)
          }
        />
      </Track>
      <HausmuellSound ambience={ambience} />
    </Sky>
  );
};
