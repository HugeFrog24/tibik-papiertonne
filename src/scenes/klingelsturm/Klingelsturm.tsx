import { ToonCanvas } from "../../toon/ToonCanvas";
import { useSeconds } from "../../useSeconds";
import { StairwellLighting } from "../../building/StairwellLighting";
import { flurSpill } from "../../building/flurSpill";
import { StairwellSet } from "../../building/StairwellSet";
import { DialogueTrack } from "../../dialogue/DialogueTrack";
import { inTheFlur } from "./doorCues";
import { Karen } from "../../Karen/Karen";
import { Phone } from "../../Karen/Phone";
import { AshPieces, Cigarette } from "../../props/Cigarette";
import { Lighter } from "../../props/Lighter";
import { SmokeCurls } from "../../smoke/SmokeCurls";
import { codaSmokeAt } from "./codaSmoke";
import { sinceStruckAt } from "./cigarette";
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
import { solveKlingelsturmIn } from "./solve";
import { useLanguage } from "../../language";
import { KLINGELSTURM_CLOCKS } from "./hold";
import { betweenTicks } from "../../physics/betweenTicks";
import { storyJumpsIn } from "../../toon/shots";
import { klingelsturmSprayIn } from "./spray";

export const Klingelsturm: React.FC<{ readonly ambience?: boolean }> = ({
  ambience = true,
}) => {
  const language = useLanguage();
  const clock = KLINGELSTURM_CLOCKS[language];
  const u = useSeconds();
  const t = clock.storyAt(u);
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
  } = betweenTicks(solveKlingelsturmIn(language), storyJumpsIn(SHOTS).map(clock.editAt))(u);
  return (
    <Sky>
      <ToonCanvas name="Klingelsturm – 3D" fisheye={shotAt(t).name === "Spyhole"}>
        <ShotCameras shots={SHOTS} clock={clock} />
        <StairwellLighting lights={lights} spill={flurSpill(tibikDoor)} />
        <Street windAt={KLINGELSTURM_FROM + u} />
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
        {lighter ? <Lighter frame={lighter.frame} flame={lighter.flame} t={t} sinceStruck={sinceStruckAt(t)} /> : null}
        <SmokeCurls curls={codaSmokeAt(t)} />
        <SprayView frame={klingelsturmSprayIn(language).frameAt(u)} />
      </ToonCanvas>
      <DialogueTrack scene="klingelsturm" lines={LINES} inside={inTheFlur} clock={clock} />
      <KlingelsturmSound ambience={ambience} />
    </Sky>
  );
};
