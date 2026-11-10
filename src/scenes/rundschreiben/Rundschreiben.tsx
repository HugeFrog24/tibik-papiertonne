import { ToonCanvas } from "../../toon/ToonCanvas";
import { useSeconds } from "../../useSeconds";
import { StairwellSet } from "../../building/StairwellSet";
import { Envelope } from "../../props/Envelope";
import { KeyRing } from "../../props/KeyRing";
import { Letter } from "../../props/Letter";
import { BinRow, Sky, StreetLighting } from "../../street/StreetSet";
import { Street } from "../../street/Street";
import { Tibik } from "../../Tibik/Tibik";
import { CameraRig } from "../../toon/primitives";
import { cameraAt, shotAt } from "./cameras";
import { solveRundschreiben } from "./solve";
import { betweenTicks } from "../../physics/betweenTicks";
import { rundschreibenRain } from "./rain";
import { LINES, UNFOLD } from "./choreography";
import { paperSpotsAt } from "../../props/letterShape";
import { Rain } from "../../weather/Rain";
import { WEATHER } from "../../weather/overcast";
import { DayLight } from "../../weather/DayLight";
import { RundschreibenSound } from "./RundschreibenSound";
import { RUNDSCHREIBEN_FROM } from "../../timeline";
import { useFormat } from "../../useFormat";
import { DialogueTrack } from "../../dialogue/DialogueTrack";
import { LETTER_READ } from "./narration";


const Scene: React.FC = () => {
  const t = useSeconds();
  const format = useFormat();
  const state = betweenTicks(solveRundschreiben)(t);
  return (
    <>
      <Street
        weather="rain"
        windAt={RUNDSCHREIBEN_FROM + t}
        lampOn={state.lampOn}
        mailboxDoor={state.mailboxDoor}
        haustuer={state.haustuer}
      />
      <StairwellSet tibikDoor={0} lights={1} />
      <BinRow lids={state.lids} boxTaken={false} emptied />
      <Tibik
        position={state.tibik.position}
        rotationY={state.tibik.rotationY}
        pose={state.tibik.pose}
        armsOnly={shotAt(t).pov === true}
      />
      {state.keys ? <KeyRing matrix={state.keys} /> : null}
      {state.letter ? (
        <Letter
          matrix={state.letter.matrix}
          fold={state.letter.fold}
          spots={paperSpotsAt(t, UNFOLD[0])}
        />
      ) : null}
      <Rain drops={rundschreibenRain(t, state, format)} camera={cameraAt(t, format)} look={WEATHER.rain} lampsOn={false} />
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
  const t = useSeconds();
  return (
    <Sky weather="rain">
      <ToonCanvas name="Rundschreiben – 3D">
        <CameraRig {...cameraAt(t, useFormat())} />
        <StreetLighting weather="rain" />
        <DayLight weather="rain">
          <Scene />
        </DayLight>
      </ToonCanvas>
      <DialogueTrack lines={LETTER_READ} name="Narration" />
      <DialogueTrack lines={LINES} />
      <RundschreibenSound ambience={ambience} />
    </Sky>
  );
};
