import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { Bedroom, BedroomLighting } from "../../building/Bedroom";
import { BED_RECT } from "../../building/bedroomShape";
import { StairwellSet } from "../../building/StairwellSet";
import { clamp } from "../../characters/scalar";
import { allColliders } from "../../characters/skeleton";
import { Caption } from "../../dialogue/Caption";
import { Blanket } from "../../props/Blanket";
import { KeyRing } from "../../props/KeyRing";
import { Street } from "../../street/Street";
import { BinRow, Sky, StreetLighting } from "../../street/StreetSet";
import { NACHTRUHE_FROM } from "../../timeline";
import { asCharacter } from "../../Tibik/character";
import { RIG } from "../../Tibik/rig";
import { Tibik } from "../../Tibik/Tibik";
import { CameraRig } from "../../toon/primitives";
import { ToonCanvas } from "../../toon/ToonCanvas";
import { DayLight } from "../../weather/DayLight";
import { WEATHER, facadeLight, type WeatherLook } from "../../weather/overcast";
import { Rain } from "../../weather/Rain";
import { rainAt } from "../../weather/rainDrops";
import { streetSolids } from "../streetSolids";
import { blanketLie } from "./bedroom";
import { CAPTION, cameraAt, inTheBedroom, lightingAt } from "./cameras";
import { solveNachtruhe, type NachtruheState } from "./solve";
import { DAWN, DUSK } from "./timeline";

const daylightOf = (look: WeatherLook) =>
  clamp((facadeLight(look) - facadeLight(WEATHER.night)) / (facadeLight(WEATHER.rain) - facadeLight(WEATHER.night)), 0, 1);

const Outside: React.FC<{ readonly t: number; readonly state: NachtruheState }> = ({ t, state }) => (
  <>
    <Street
      look={state.look}
      windAt={NACHTRUHE_FROM + t}
      lampOn={state.entranceLamp}
      haustuer={state.haustuer}
      roofs
      town={{ lit: state.town }}
      windowLight={state.windowLight}
      bedroomCurtains={state.curtains}
      lampsOn={state.lampsOn}
    />
    {state.rain ? <Rain drops={rainAt(t, cameraAt(t).position, streetSolids(state), [])} /> : null}
  </>
);

const Scene: React.FC = () => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const state = solveNachtruhe(t);
  const tibik = <Tibik position={state.tibik.position} rotationY={state.tibik.rotationY} pose={state.tibik.pose} tilt={state.tibik.tilt} />;
  if (inTheBedroom(t))
    return (
      <>
        <Bedroom door={state.bedroomDoor} lamps={state.lamps} curtain={state.curtains} daylight={daylightOf(state.look)} streetGlow={state.lampsOn ? 1 : 0} />
        <Blanket bed={BED_RECT} body={allColliders(RIG, asCharacter(state.tibik))} {...blanketLie(state.blanket)} />
        {tibik}
        <Outside t={t} state={state} />
      </>
    );
  return (
    <>
      <Outside t={t} state={state} />
      {state.haustuer > 0 || state.indoors > 0 ? <StairwellSet tibikDoor={0} lights={state.stairwellLit ? 1 : 0} /> : null}
      <BinRow lids={state.lids} boxTaken emptied={t >= DAWN[0]} />
      {t < DUSK[1] ? tibik : null}
      {state.keys ? <KeyRing matrix={state.keys} /> : null}
    </>
  );
};

const Lighting: React.FC<{ readonly t: number }> = ({ t }) => {
  const state = solveNachtruhe(t);
  const lit = lightingAt(t);
  return (
    <>
      {lit.street ? <StreetLighting look={state.look} /> : null}
      {lit.bedroom ? <BedroomLighting lamps={state.lamps} daylight={daylightOf(state.look)} streetGlow={state.lampsOn ? 1 : 0} /> : null}
    </>
  );
};

export const Nachtruhe: React.FC<{ readonly ambience?: boolean }> = () => {
  const { fps } = useVideoConfig();
  const t = useCurrentFrame() / fps;
  const { look } = solveNachtruhe(t);
  return (
    <Sky look={look}>
      <ToonCanvas name="Nachtruhe – 3D">
        <CameraRig {...cameraAt(t)} />
        <Lighting t={t} />
        <DayLight look={look}>
          <Scene />
        </DayLight>
      </ToonCanvas>
      <Sequence from={Math.round(CAPTION.from * fps)} durationInFrames={Math.round((CAPTION.to - CAPTION.from) * fps)} layout="none">
        <AbsoluteFill>
          <Caption text={CAPTION.text} />
        </AbsoluteFill>
      </Sequence>
    </Sky>
  );
};
