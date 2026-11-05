import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { useSeconds } from "../../useSeconds";
import { Bedroom, BedroomLighting } from "../../building/Bedroom";
import { BED_RECT } from "../../building/bedroomShape";
import { stairwellShown } from "../../building/stairwell";
import { StairwellSet } from "../../building/StairwellSet";
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
import { daylightOf } from "../../weather/overcast";
import { Rain } from "../../weather/Rain";
import { rainAt, viewOf } from "../../weather/rainDrops";
import { rainLight } from "../../weather/rainLight";
import { streetSolids } from "../streetSolids";
import { blanketLie } from "./bedroom";
import { CAPTION, cameraAt, inTheBedroom, lightingAt } from "./cameras";
import { NachtruheSound } from "./NachtruheSound";
import { solveNachtruhe, type NachtruheState } from "./solve";
import { DAWN, DUSK } from "./timeline";

const roomLight = (state: NachtruheState) => ({ lamps: state.lamps, daylight: daylightOf(state.look), streetGlow: state.lampsOn ? 1 : 0 });

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
    {state.rain > 0 ? (
      <Rain
        drops={rainAt(t, cameraAt(t).position, streetSolids(state), [], { share: state.rain, view: viewOf(cameraAt(t)) })}
        eye={cameraAt(t).position}
        fov={cameraAt(t).fov}
        light={rainLight(state.look, state.lampsOn)}
      />
    ) : null}
  </>
);

const Scene: React.FC = () => {
  const t = useSeconds();
  const state = solveNachtruhe(t);
  const tibik = <Tibik position={state.tibik.position} rotationY={state.tibik.rotationY} pose={state.tibik.pose} tilt={state.tibik.tilt} />;
  if (inTheBedroom(t))
    return (
      <>
        <Bedroom door={state.bedroomDoor} curtain={state.curtains} {...roomLight(state)} />
        <Blanket bed={BED_RECT} body={allColliders(RIG, asCharacter(state.tibik))} {...blanketLie(state.blanket)} />
        {tibik}
        <Outside t={t} state={state} />
      </>
    );
  return (
    <>
      <Outside t={t} state={state} />
      {stairwellShown(state) ? <StairwellSet tibikDoor={0} lights={state.stairwellLit ? 1 : 0} /> : null}
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
      {lit.bedroom ? <BedroomLighting {...roomLight(state)} /> : null}
    </>
  );
};

export const Nachtruhe: React.FC<{ readonly ambience?: boolean }> = ({ ambience = true }) => {
  const { fps } = useVideoConfig();
  const t = useSeconds();
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
      <NachtruheSound ambience={ambience} />
    </Sky>
  );
};
