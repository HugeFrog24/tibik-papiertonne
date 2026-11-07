import { ToonCanvas } from "../../toon/ToonCanvas";
import { Track } from "remotion";
import { useSeconds } from "../../useSeconds";
import { StairwellLighting } from "../../building/StairwellLighting";
import { flurSpill } from "../../building/flurSpill";
import { StairwellSet } from "../../building/StairwellSet";
import { DialogueTrack } from "../../dialogue/DialogueTrack";
import { Karen } from "../../Karen/Karen";
import { Phone } from "../../Karen/Phone";
import { AshPieces, Cigarette } from "../../props/Cigarette";
import { Lighter } from "../../props/Lighter";
import { SmokeCurls } from "../../smoke/SmokeCurls";
import { codaSmokeAt } from "./codaSmoke";
import { CODA } from "./cigarette";
import { SprayView } from "../../Karen/SprayView";
import { Tibik } from "../../Tibik/Tibik";
import { Street } from "../../street/Street";
import { Sky } from "../../street/StreetSet";
import { KLINGELSTURM_FROM } from "../../timeline";
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
  const t = useSeconds();
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
    cigarette,
    lighter,
    tibikHere,
    ash,
  } = solveKlingelsturm(t);
  return (
    <Sky>
      <ToonCanvas name="Klingelsturm – 3D" fisheye={shotAt(t).name === "Spyhole"}>
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
        {tibikHere ? (
          <Tibik
            position={tibik.position}
            rotationY={tibik.rotationY}
            pose={tibik.pose}
            carrying={
              carried ? <CarriedParcel swap={swapAt(t)} taping={taping} /> : null
            }
          />
        ) : null}
        {cigarette ? <Cigarette frame={cigarette.frame} burned={cigarette.burned} ash={cigarette.ash} glow={cigarette.glow} /> : null}
        {ash ? <AshPieces pieces={ash} /> : null}
        {lighter ? <Lighter frame={lighter.frame} flame={lighter.flame} t={t} sinceStruck={t - CODA.flick} /> : null}
        <SmokeCurls curls={codaSmokeAt(t)} />
        <SprayView frame={klingelsturmSprayAt(t)} />
      </ToonCanvas>
      <Track name="Dialogue">
        <DialogueTrack lines={LINES} tailTo={tailTo} />
      </Track>
      <KlingelsturmSound ambience={ambience} />
    </Sky>
  );
};
