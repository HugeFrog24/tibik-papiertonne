import { useSeconds } from "../../useSeconds";
import { Bedroom, BedroomLighting } from "../../building/Bedroom";
import { BED_RECT, RAIN_ON_THE_GLASS } from "../../building/bedroomShape";
import { StairwellSet } from "../../building/StairwellSet";
import { Blanket } from "../../props/Blanket";
import { KeyRing } from "../../props/KeyRing";
import { Street } from "../../street/Street";
import { BinRow, Sky, StreetLighting } from "../../street/StreetSet";
import { NACHTRUHE_STORY_ZERO } from "../../timeline";
import { Tibik } from "../../Tibik/Tibik";
import { CameraRig } from "../../toon/primitives";
import { ToonCanvas } from "../../toon/ToonCanvas";
import { DayLight } from "../../weather/DayLight";
import { daylightOf } from "../../weather/overcast";
import { Rain } from "../../weather/Rain";
import { RainOnGlass } from "../../weather/RainOnGlass";
import { rainSeenBy } from "../../weather/rainDrops";
import { useFormat } from "../../useFormat";
import { streetSolids } from "../streetSolids";
import { blanketLie, underTheFleece } from "./bedroom";
import { cameraAt, inTheBedroom, lightingAt } from "./cameras";
import { NachtruheSound } from "./NachtruheSound";
import { solveNachtruhe, type NachtruheState } from "./solve";
import { betweenTicks } from "../../physics/betweenTicks";
import { DRONE, DUSK, STORY_JUMPS } from "./timeline";

const roomLight = (state: NachtruheState) => ({ lamps: state.lamps, daylight: daylightOf(state.look), streetGlow: state.lampsOn ? 1 : 0 });

const Outside: React.FC<{ readonly t: number; readonly state: NachtruheState }> = ({ t, state }) => {
  const format = useFormat();
  return (
  <>
    <Street
      look={state.look}
      windAt={NACHTRUHE_STORY_ZERO + t}
      lampOn={state.entranceLamp}
      haustuer={state.haustuer}
      roofs
      town={{ lit: state.town }}
      windowLight={state.windowLight}
      bedroomCurtains={state.curtains}
      lampsOn={state.lampsOn}
    />
    {state.rain > 0 ? (
      <Rain
        drops={rainSeenBy(t, cameraAt(t, format), streetSolids(state), [], state.rain, format)}
        camera={cameraAt(t, format)}
        look={state.look}
        lampsOn={state.lampsOn}
      />
    ) : null}
  </>
  );
};

const Scene: React.FC = () => {
  const t = useSeconds();
  const state = betweenTicks(solveNachtruhe, STORY_JUMPS)(t);
  const tibik = <Tibik position={state.tibik.position} rotationY={state.tibik.rotationY} pose={state.tibik.pose} tilt={state.tibik.tilt} />;
  if (inTheBedroom(t))
    return (
      <>
        <Bedroom door={state.bedroomDoor} curtain={state.curtains} {...roomLight(state)} />
        <RainOnGlass pane={RAIN_ON_THE_GLASS} wet={state.rain} />
        <Blanket bed={BED_RECT} body={underTheFleece(t, state.tibik)} {...blanketLie(state.blanket)} />
        {tibik}
        <Outside t={t} state={state} />
      </>
    );
  return (
    <>
      <Outside t={t} state={state} />
      <StairwellSet tibikDoor={0} lights={state.stairwellLit ? 1 : 0} livingRoomLit={state.livingRoomLit} />
      <BinRow lids={state.lids} boxTaken emptied={t >= DRONE[1]} />
      {t < DUSK[1] ? tibik : null}
      {state.keys ? <KeyRing matrix={state.keys} /> : null}
    </>
  );
};

const Lighting: React.FC<{ readonly t: number }> = ({ t }) => {
  const state = betweenTicks(solveNachtruhe, STORY_JUMPS)(t);
  const lit = lightingAt(t);
  return (
    <>
      {lit.street ? <StreetLighting look={state.look} /> : null}
      {lit.bedroom ? <BedroomLighting {...roomLight(state)} curtain={state.curtains} /> : null}
    </>
  );
};

export const Nachtruhe: React.FC<{ readonly ambience?: boolean }> = ({ ambience = true }) => {
  const t = useSeconds();
  const { look } = betweenTicks(solveNachtruhe, STORY_JUMPS)(t);
  return (
    <Sky look={look}>
      <ToonCanvas name="Nachtruhe – 3D">
        <CameraRig {...cameraAt(t, useFormat())} />
        <Lighting t={t} />
        <DayLight look={look}>
          <Scene />
        </DayLight>
      </ToonCanvas>
      <NachtruheSound ambience={ambience} />
    </Sky>
  );
};
