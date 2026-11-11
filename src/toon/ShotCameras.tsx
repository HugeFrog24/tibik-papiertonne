import { Sequence, useVideoConfig } from "remotion";
import { exposureOf } from "./exposure";
import { useSeconds } from "../useSeconds";
import { CameraRig } from "./primitives";
import { shotFrames } from "./shotFrames";
import { heldShots, inFormat, sinceTheCut, sinceTheHeldCut, type Shot } from "./shots";
import { useFormat } from "../useFormat";
import type { SceneClock } from "../sceneClock";

type Clock = (filmT: number) => number;

const ShotCamera = ({ authored, storyOf, clock }: { readonly authored: Shot; readonly storyOf?: Clock | undefined; readonly clock?: SceneClock | undefined }) => {
  const sinceCut = useSeconds();
  const { fps } = useVideoConfig();
  const shot = inFormat(authored, useFormat());
  const at = (s: number) => (clock ? sinceTheHeldCut(shot, s, clock) : sinceTheCut(shot, s, storyOf));
  const exposure = shot.blur ? exposureOf(at, sinceCut, fps) : undefined;
  return <CameraRig {...at(sinceCut)} exposure={exposure} />;
};

export const ShotCameras = ({ shots, storyOf, clock }: { readonly shots: readonly Shot[]; readonly storyOf?: Clock | undefined; readonly clock?: SceneClock | undefined }) => {
  const { fps } = useVideoConfig();
  const windows = shotFrames(clock ? heldShots(shots, clock) : shots, fps);
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
          <ShotCamera authored={shot} storyOf={storyOf} clock={clock} />
        </Sequence>
      ))}
    </>
  );
};
