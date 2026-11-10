import { Sequence, useVideoConfig } from "remotion";
import { exposureOf } from "./exposure";
import { useSeconds } from "../useSeconds";
import { CameraRig } from "./primitives";
import { shotFrames } from "./shotFrames";
import { inFormat, sinceTheCut, type Shot } from "./shots";
import { useFormat } from "../useFormat";

type Clock = (filmT: number) => number;

const ShotCamera = ({ authored, storyOf }: { readonly authored: Shot; readonly storyOf?: Clock | undefined }) => {
  const sinceCut = useSeconds();
  const { fps } = useVideoConfig();
  const shot = inFormat(authored, useFormat());
  const exposure = shot.blur ? exposureOf((s) => sinceTheCut(shot, s, storyOf), sinceCut, fps) : undefined;
  return <CameraRig {...sinceTheCut(shot, sinceCut, storyOf)} exposure={exposure} />;
};

export const ShotCameras = ({ shots, storyOf }: { readonly shots: readonly Shot[]; readonly storyOf?: Clock | undefined }) => {
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
          <ShotCamera authored={shot} storyOf={storyOf} />
        </Sequence>
      ))}
    </>
  );
};
