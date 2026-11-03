import { ThreeCanvas } from "@remotion/three";
import {
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Tibik } from "../../Tibik/Tibik";
import { CameraRig } from "../../toon/primitives";
import {
  BIN_Z,
  SHOT_FOUND_BOX,
  SHOT_INSIDE_BIN,
  SHOT_OPEN_LID,
  TARGET_BIN_X,
  kf,
} from "./choreography";
import { Karton } from "../../street/Karton";
import { BinRow, Sky, StreetLighting } from "../../street/StreetSet";
import { PapiertonnenSound } from "./PapiertonnenSound";
import { solvePapiertonnen } from "./solve";
import { FOUND_KARTON_SIZE } from "../../street/kartonShape";
import { Street } from "../../street/Street";

const WideCamera: React.FC = () => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const pan = kf(t, [0, 3.2], [-0.9, 0.5]);
  const crane = kf(t, [0, 2.4], [1, 0]);
  return (
    <CameraRig
      position={[0.7 + pan, 1.55 + crane * 8.5, 4.6 + crane * 11]}
      target={[0.7 + pan, 1.0 + crane * 6.5, -1.3]}
      fov={34 + crane * 18}
    />
  );
};

const OpenLidCamera: React.FC = () => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const push = kf(t, [0, 1.6], [0, 1]);
  return (
    <CameraRig
      position={[4.3 - push * 0.4, 1.45, 0.4 - push * 0.15]}
      target={[TARGET_BIN_X - 0.1, 1.0, -1.3]}
      fov={36}
    />
  );
};

const InsideBinCamera: React.FC = () => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const drift = kf(t, [0, 2.2], [0, 0.03]);
  return (
    <CameraRig
      position={[TARGET_BIN_X, 0.9, BIN_Z - 0.24]}
      target={[TARGET_BIN_X + drift, 1.3, BIN_Z + 0.3]}
      fov={62}
    />
  );
};

const FoundBoxCamera: React.FC = () => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const times = [0, 1.2, 2.0, 3.5];
  return (
    <CameraRig
      position={[kf(t, times, [3.4, 3.35, 3.3, 3.05]), kf(t, times, [1.95, 1.9, 1.5, 1.45]), kf(t, times, [-0.15, -0.05, 2.8, 2.5])]}
      target={[kf(t, times, [1.35, 1.35, 1.25, 1.25]), kf(t, times, [1.0, 1.05, 1.05, 1.05]), kf(t, times, [-1.45, -1.35, -0.85, -0.85])]}
      fov={kf(t, times, [36, 36, 32, 32])}
    />
  );
};

const Characters: React.FC = () => {
  const t = useCurrentFrame() / useVideoConfig().fps;
  const { lids, tibik, karton } = solvePapiertonnen(t);

  return (
    <>
      <BinRow lids={lids} boxTaken={karton !== null} />
      <Tibik
        position={tibik.position}
        rotationY={tibik.rotationY}
        pose={tibik.pose}
        carrying={karton ? <Karton position={karton.position} rotation={karton.rotation} open={karton.open} size={FOUND_KARTON_SIZE} /> : null}
      />
    </>
  );
};

export const Papiertonnen: React.FC<{
  readonly ambience?: boolean;
}> = ({ ambience = true }) => {
  const { width, height, fps } = useVideoConfig();

  return (
    <Sky>
      <ThreeCanvas name="Papiertonnen – 3D" width={width} height={height} shadows flat>
        <Sequence name="Wide: walk to the bins" layout="none" durationInFrames={SHOT_OPEN_LID * fps}>
          <WideCamera />
        </Sequence>
        <Sequence
          name="Side: open the lid"
          layout="none"
          from={SHOT_OPEN_LID * fps}
          durationInFrames={(SHOT_INSIDE_BIN - SHOT_OPEN_LID) * fps}
        >
          <OpenLidCamera />
        </Sequence>
        <Sequence
          name="Inside the bin"
          layout="none"
          from={SHOT_INSIDE_BIN * fps}
          durationInFrames={(SHOT_FOUND_BOX - SHOT_INSIDE_BIN) * fps}
        >
          <InsideBinCamera />
        </Sequence>
        <Sequence name="Found a box" layout="none" from={SHOT_FOUND_BOX * fps}>
          <FoundBoxCamera />
        </Sequence>

        <StreetLighting />
        <Street />
        <Characters />
      </ThreeCanvas>
      <PapiertonnenSound ambience={ambience} />
    </Sky>
  );
};
