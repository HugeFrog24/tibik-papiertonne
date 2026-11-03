import { ThreeCanvas } from "@remotion/three";
import { Sequence, Track, useCurrentFrame, useVideoConfig } from "remotion";
import { SpeechBubble } from "../../dialogue/SpeechBubble";
import { Karen } from "../../Karen/Karen";
import { FOUND_KARTON_SIZE } from "../../street/kartonShape";
import { Karton } from "../../street/Karton";
import { Street } from "../../street/Street";
import { BinRow, Sky, StreetLighting } from "../../street/StreetSet";
import { Tibik } from "../../Tibik/Tibik";
import { CameraRig } from "../../toon/primitives";
import { SHOTS } from "./cameras";
import { HausmuellSound } from "./HausmuellSound";
import { solveHausmuell } from "./solve";
import { mouthOnScreen } from "./speakers";

const ShotCamera: React.FC<{ readonly shot: (typeof SHOTS)[number] }> = ({ shot }) => {
  const { fps } = useVideoConfig();
  const t = useCurrentFrame() / fps + shot.from;
  return <CameraRig {...shot.at(t)} />;
};

const Characters: React.FC = () => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const { lids, tibik, karton, karen } = solveHausmuell(t);
  return (
    <>
      <BinRow lids={lids} boxTaken />
      <Tibik
        position={tibik.position}
        rotationY={tibik.rotationY}
        pose={tibik.pose}
        carrying={<Karton position={karton.position} rotation={karton.rotation} open={karton.open} size={FOUND_KARTON_SIZE} />}
      />
      <Karen
        position={karen.position}
        rotationY={karen.rotationY}
        pose={karen.pose}
        mouthOpen={karen.mouthOpen}
        pointing={karen.pointing}
      />
    </>
  );
};

export const Hausmuell: React.FC<{
  readonly ambience?: boolean;
}> = ({ ambience = true }) => {
  const { width, height, fps } = useVideoConfig();
  const t = useCurrentFrame() / fps;

  return (
    <Sky>
      <ThreeCanvas name="Hausmuell – 3D" width={width} height={height} shadows flat>
        {SHOTS.map((shot) => (
          <Sequence
            key={shot.name}
            name={shot.name}
            layout="none"
            from={Math.round(shot.from * fps)}
            durationInFrames={Math.round((shot.to - shot.from) * fps)}
          >
            <ShotCamera shot={shot} />
          </Sequence>
        ))}
        <StreetLighting />
        <Street />
        <Characters />
      </ThreeCanvas>

      <Track name="Dialogue">
        <SpeechBubble
          name="Karen: Das dürfen Sie nicht"
          from={Math.round(2.1 * fps)}
          durationInFrames={Math.round(1.8 * fps)}
          tone="shout"
          tailTo={mouthOnScreen(t, "karen")}
          style={{ left: 980, top: 40, width: 860, height: 380, fontSize: 92 }}
        >
          DAS DÜRFEN SIE NICHT!!!!
        </SpeechBubble>
        <SpeechBubble
          name="Tibik: Was darf ich nicht?"
          from={Math.round(4.2 * fps)}
          durationInFrames={Math.round(1.3 * fps)}
          tone="calm"
          tailTo={mouthOnScreen(t, "tibik")}
          style={{ left: 120, top: 60, width: 640, height: 250, fontSize: 56 }}
        >
          Was darf ich nicht?
        </SpeechBubble>
        <SpeechBubble
          name="Karen: Sie klauen den Hausmüll"
          from={Math.round(5.7 * fps)}
          durationInFrames={Math.round(1.9 * fps)}
          tone="shout"
          tailTo={mouthOnScreen(t, "karen")}
          style={{ left: 960, top: 40, width: 900, height: 380, fontSize: 88 }}
        >
          SIE KLAUEN DEN HAUSMÜLL!
        </SpeechBubble>
        <SpeechBubble
          name="Tibik: Karton wiederverwenden"
          from={Math.round(7.9 * fps)}
          durationInFrames={Math.round(2.0 * fps)}
          tone="calm"
          tailTo={mouthOnScreen(t, "tibik")}
          style={{ left: 100, top: 50, width: 760, height: 280, fontSize: 54 }}
        >
          Ich verwende den Karton nur wieder.
        </SpeechBubble>
        <SpeechBubble
          name="Tibik: Umweltschutz"
          from={Math.round(10.1 * fps)}
          durationInFrames={Math.round(2.6 * fps)}
          tone="calm"
          tailTo={mouthOnScreen(t, "tibik")}
          style={{ left: 100, top: 50, width: 800, height: 300, fontSize: 54 }}
        >
          Das spart einen neuen und schont die Umwelt.
        </SpeechBubble>
        <SpeechBubble
          name="Karen: Hausverwaltung"
          from={Math.round(13.1 * fps)}
          durationInFrames={Math.round(2.5 * fps)}
          tone="shout"
          tailTo={mouthOnScreen(t, "karen")}
          style={{ left: 560, top: 30, width: 860, height: 380, fontSize: 80 }}
        >
          ICH MELDE SIE DER HAUSVERWALTUNG!
        </SpeechBubble>
      </Track>
      <HausmuellSound ambience={ambience} />
    </Sky>
  );
};
