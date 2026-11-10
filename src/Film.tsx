import { AbsoluteFill, Sequence, Series, useVideoConfig } from "remotion";
import { StreetAmbience } from "./street/StreetAmbience";
import { Score } from "./sound/Score";
import { MAIN_STREET } from "./sound/music";
import { SCENE_COMPONENTS } from "./sceneComponents";
import { TIMELINE_FPS, SCENES, FILM_AMBIENCE, FILM_FRAMES } from "./timeline";
import { renderFrame } from "./frameRate";
import type { RenderRate } from "./renderRate";
import { useSeconds } from "./useSeconds";
import { MixGain } from "./sound/MixAudio";
import { filmFadeAt } from "./sound/filmFade";

export const Film: React.FC<RenderRate> = () => {
  const { fps } = useVideoConfig();
  const fade = filmFadeAt(useSeconds(), FILM_FRAMES / TIMELINE_FPS);
  return (
    <MixGain.Provider value={fade}>
      <AbsoluteFill>
        <Series>
          {SCENES.map(({ name, frames, skip }) => {
            const Scene = SCENE_COMPONENTS[name];
            return (
              <Series.Sequence key={name} name={name} durationInFrames={renderFrame(frames / TIMELINE_FPS, fps)}>
                {skip ? (
                  <Sequence
                    name={`${name} from where the film joins it`}
                    from={-renderFrame(skip, fps)}
                    layout="none"
                  >
                    <Scene ambience={false} />
                  </Sequence>
                ) : (
                  <Scene ambience={false} />
                )}
              </Series.Sequence>
            );
          })}
        </Series>
        <StreetAmbience ambience={FILM_AMBIENCE} />
        <Score music={MAIN_STREET} offset={0} ambience={FILM_AMBIENCE} />
      </AbsoluteFill>
    </MixGain.Provider>
  );
};
