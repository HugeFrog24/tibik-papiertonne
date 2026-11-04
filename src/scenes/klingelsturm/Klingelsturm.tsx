import { ThreeCanvas } from "@remotion/three";
import { Track, useCurrentFrame, useVideoConfig } from "remotion";
import { StairwellLighting } from "../../building/StairwellLighting";
import { flurSpill } from "../../building/flurSpill";
import { StairwellSet } from "../../building/StairwellSet";
import { DialogueTrack } from "../../dialogue/DialogueTrack";
import { Karen } from "../../Karen/Karen";
import { Phone } from "../../Karen/Phone";
import { SprayView } from "../../Karen/SprayView";
import { Tibik } from "../../Tibik/Tibik";
import { Street } from "../../street/Street";
import { Sky } from "../../street/StreetSet";
import { KLINGELSTURM_FROM } from "../../timeline";
import { InkPass } from "../../toon/InkPass";
import { ShotCameras } from "../../toon/ShotCameras";
import { SHOTS, shotAt } from "./cameras";
import { LINES } from "./choreography";
import { CarriedParcel, FlurProps } from "./FlurProps";
import { swapAt } from "./exit";
import { KlingelsturmSound } from "./KlingelsturmSound";
import { solveKlingelsturm, tailTo } from "./solve";
import { klingelsturmSprayAt } from "./spray";

export const Klingelsturm: React.FC<{ readonly ambience?: boolean }> = ({
  ambience = true,
}) => {
  const { width, height, fps } = useVideoConfig();
  const t = useCurrentFrame() / fps;
  const {
    karen,
    tibik,
    tibikDoor,
    tibikLever,
    lights,
    phone,
    parcel,
    taping,
    carried,
  } = solveKlingelsturm(t);
  return (
    <Sky>
      <ThreeCanvas
        name="Klingelsturm – 3D"
        width={width}
        height={height}
        shadows="percentage"
        flat
      >
        <ShotCameras
          shots={SHOTS}
          camera={(shot, sinceCut) => shot.at(shot.from + sinceCut)}
        />
        <StairwellLighting lights={lights} spill={flurSpill(tibikDoor)} />
        <Street windAt={KLINGELSTURM_FROM + t} />
        <StairwellSet
          tibikDoor={tibikDoor}
          tibikLever={tibikLever}
          lights={lights}
        />
        <FlurProps closed={parcel} taping={taping} carried={carried} />
        <Karen
          position={karen.position}
          rotationY={karen.rotationY}
          pose={karen.pose}
          mouthOpen={karen.mouthOpen}
          pointing={karen.pointing}
          carrying={
            phone ? (
              <Phone place={phone} screen={phone.screen} />
            ) : null
          }
        />
        <Tibik
          position={tibik.position}
          rotationY={tibik.rotationY}
          pose={tibik.pose}
          carrying={
            carried ? <CarriedParcel swap={swapAt(t)} taping={taping} /> : null
          }
        />
        <SprayView frame={klingelsturmSprayAt(t)} />
        <InkPass fisheye={shotAt(t).name === "Spyhole"} />
      </ThreeCanvas>
      <Track name="Dialogue">
        <DialogueTrack lines={LINES} tailTo={tailTo} />
      </Track>
      <KlingelsturmSound ambience={ambience} />
    </Sky>
  );
};
