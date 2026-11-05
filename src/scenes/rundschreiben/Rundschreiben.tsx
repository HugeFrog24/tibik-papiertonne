import { ToonCanvas } from "../../toon/ToonCanvas";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { StairwellSet } from "../../building/StairwellSet";
import { Envelope } from "../../props/Envelope";
import { KeyRing } from "../../props/KeyRing";
import { Letter } from "../../props/Letter";
import { BinRow, Sky, StreetLighting } from "../../street/StreetSet";
import { Street } from "../../street/Street";
import { Tibik } from "../../Tibik/Tibik";
import { CameraRig } from "../../toon/primitives";
import { AbsoluteFill, Sequence } from "remotion";
import { Caption } from "../../dialogue/Caption";
import { CAPTION, cameraAt, shotAt } from "./cameras";
import { solveRundschreiben } from "./solve";
import { rundschreibenRain } from "./rain";
import { UNFOLD } from "./choreography";
import { paperSpotsAt } from "../../props/letterShape";
import { Rain } from "../../weather/Rain";
import { RundschreibenSound } from "./RundschreibenSound";
import { RUNDSCHREIBEN_FROM } from "../../timeline";


const Scene: React.FC = () => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const state = solveRundschreiben(t);
  return (
    <>
      <Street
        weather="rain"
        windAt={RUNDSCHREIBEN_FROM + t}
        lampOn={state.lampOn}
        mailboxDoor={state.mailboxDoor}
        haustuer={state.haustuer}
      />
      {state.haustuer > 0 || state.indoors > 0 ? (
        <StairwellSet tibikDoor={0} lights={1} />
      ) : null}
      <BinRow lids={state.lids} boxTaken={false} emptied />
      {shotAt(t).pov ? null : (
        <Tibik
          position={state.tibik.position}
          rotationY={state.tibik.rotationY}
          pose={state.tibik.pose}
        />
      )}
      {state.keys ? <KeyRing matrix={state.keys} /> : null}
      {state.letter ? (
        <Letter
          matrix={state.letter.matrix}
          fold={state.letter.fold}
          spots={paperSpotsAt(t, UNFOLD[0])}
        />
      ) : null}
      <Rain drops={rundschreibenRain(t, state)} />
      {state.envelope ? (
        <Envelope
          matrix={state.envelope.matrix}
          flap={state.envelope.flap}
          bow={state.envelope.bow}
          twist={state.envelope.twist}
        />
      ) : null}
    </>
  );
};

export const Rundschreiben: React.FC<{
  readonly ambience?: boolean;
}> = ({ ambience = true }) => {
  const { fps } = useVideoConfig();
  const t = useCurrentFrame() / fps;
  return (
    <Sky weather="rain">
      <ToonCanvas name="Rundschreiben – 3D">
        <CameraRig {...cameraAt(t)} />
        <StreetLighting weather="rain" />
        <Scene />
      </ToonCanvas>
      <Sequence from={Math.round(CAPTION.from * fps)} durationInFrames={Math.round((CAPTION.to - CAPTION.from) * fps)} layout="none">
        <AbsoluteFill>
          <Caption text={CAPTION.text} />
        </AbsoluteFill>
      </Sequence>
      <RundschreibenSound ambience={ambience} />
    </Sky>
  );
};
