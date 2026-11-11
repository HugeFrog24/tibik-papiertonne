import { AbsoluteFill, Sequence, Series, useVideoConfig } from "remotion";
import { StreetAmbience } from "./street/StreetAmbience";
import { Score } from "./sound/Score";
import { MAIN_STREET } from "./sound/music";
import { SCENE_COMPONENTS } from "./sceneComponents";
import { TIMELINE_FPS, FILM_SCENES, filmAmbienceIn, filmFramesIn } from "./timeline";
import { renderFrame } from "./frameRate";
import type { RenderProps } from "./renderRate";
import { LanguageContext } from "./language";
import { useSeconds } from "./useSeconds";
import { MixGain } from "./sound/MixAudio";
import { filmFadeAt } from "./sound/filmFade";

export const Film: React.FC<RenderProps> = ({ language }) => {
  const { fps } = useVideoConfig();
  const fade = filmFadeAt(useSeconds(), filmFramesIn(language) / TIMELINE_FPS);
  const ambience = filmAmbienceIn(language);
  return (
    <LanguageContext.Provider value={language}>
      <MixGain.Provider value={fade}>
        <AbsoluteFill>
          <Series>
            {FILM_SCENES[language].map(({ name, frames, skip }) => {
              const Scene = SCENE_COMPONENTS[name];
              return (
                <Series.Sequence
                  key={name}
                  name={name}
                  durationInFrames={renderFrame(frames / TIMELINE_FPS, fps)}
                >
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
          <StreetAmbience ambience={ambience} />
          <Score music={MAIN_STREET} offset={0} ambience={ambience} />
        </AbsoluteFill>
      </MixGain.Provider>
    </LanguageContext.Provider>
  );
};
