import { ToonCanvas } from "../../toon/ToonCanvas";
import { HAUSMUELL_FROM } from "../../timeline";
import { useSeconds } from "../../useSeconds";
import { DialogueTrack } from "../../dialogue/DialogueTrack";
import { Karen } from "../../Karen/Karen";
import { SprayView } from "../../Karen/SprayView";
import { FOUND_KARTON_SIZE } from "../../street/kartonShape";
import { Karton } from "../../street/Karton";
import { Street } from "../../street/Street";
import { StairwellSet } from "../../building/StairwellSet";
import { BinRow, Sky, StreetLighting } from "../../street/StreetSet";
import { Tibik } from "../../Tibik/Tibik";
import { ShotCameras } from "../../toon/ShotCameras";
import { SHOTS } from "./cameras";
import { LINES } from "./choreography";
import { HausmuellSound } from "./HausmuellSound";
import { solveHausmuellIn } from "./solve";
import { useLanguage } from "../../language";
import { betweenTicks } from "../../physics/betweenTicks";
import { storyJumpsIn } from "../../toon/shots";
import { hausmuellSprayIn } from "./spray";

const Characters: React.FC = () => {
  const t = useSeconds();
  const language = useLanguage();
  const { lids, tibik, karton, karen } = betweenTicks(solveHausmuellIn(language), storyJumpsIn(SHOTS))(t);
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
      <SprayView frame={hausmuellSprayIn(language).frameAt(t)} />
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
        <ShotCameras shots={SHOTS} />
        <StreetLighting />
        <Street windAt={HAUSMUELL_FROM + t} />
        <StairwellSet tibikDoor={0} lights={1} />
        <Characters />
      </ToonCanvas>

      <DialogueTrack scene="hausmuell" lines={LINES} />
      <HausmuellSound ambience={ambience} />
    </Sky>
  );
};
