import { Sequence, useVideoConfig } from "remotion";
import { exposureOf } from "./exposure";
import { useSeconds } from "../useSeconds";
import { CameraRig } from "./primitives";
import { shotFrames, type CutShot } from "./shotFrames";

type Framing = React.ComponentProps<typeof CameraRig>;

const ShotCamera = <S extends CutShot>({
  shot,
  camera,
}: {
  readonly shot: S;
  readonly camera: (shot: S, sinceCut: number) => Framing;
}) => {
  const sinceCut = useSeconds();
  const { fps } = useVideoConfig();
  const exposure = shot.blur ? exposureOf((s) => camera(shot, s), sinceCut, fps) : undefined;
  return <CameraRig {...camera(shot, sinceCut)} exposure={exposure} />;
};

export const ShotCameras = <S extends CutShot>({
  shots,
  camera,
}: {
  readonly shots: readonly S[];
  readonly camera: (shot: S, sinceCut: number) => Framing;
}) => {
  const { fps } = useVideoConfig();
  const windows = shotFrames(shots, fps);
  return (
    <>
      {shots.map((shot, i) => (
        <Sequence
          key={shot.name}
          name={shot.name}
          layout="none"
          from={windows[i].from}
          durationInFrames={windows[i].duration}
        >
          <ShotCamera shot={shot} camera={camera} />
        </Sequence>
      ))}
    </>
  );
};
