import { FORMATS, type Format } from "./frameRate";
import { Composition, Folder, Still } from "remotion";
import { Film } from "./Film";
import { FILM_FRAMES, FPS, SCENES, wholeFrames } from "./timeline";
import { SCENE_COMPONENTS } from "./sceneComponents";
import { KarenModelSheet } from "./Karen/KarenModelSheet";
import { StairwellSheet } from "./building/StairwellSheet";
import { TibikModelSheet } from "./Tibik/TibikModelSheet";
import { CarSheet } from "./street/CarSheet";
import { CAR_VIEWS } from "./street/carViews";
import { PropsSheet } from "./props/PropsSheet";
import { TALL_SUFFIX, compositionId } from "./compositionIds";

const FilmAndScenes: React.FC<{ readonly format: Format }> = ({ format }) => {
  const { width, height } = FORMATS[format];
  return (
    <>
      <Composition id={compositionId("Film", format)} component={Film} durationInFrames={FILM_FRAMES} fps={FPS} width={width} height={height} />
      <Folder name={format === "tall" ? `Scenes${TALL_SUFFIX}` : "Scenes"}>
        {SCENES.map((scene) => (
          <Composition
            key={scene.name}
            id={compositionId(scene.name, format)}
            component={SCENE_COMPONENTS[scene.name]}
            durationInFrames={wholeFrames(scene)}
            fps={FPS}
            width={width}
            height={height}
          />
        ))}
      </Folder>
    </>
  );
};

export const RemotionRoot: React.FC = () => {
  const { width, height } = FORMATS.wide;
  return (
    <>
      <FilmAndScenes format="wide" />
      <Folder name="Vertical">
        <FilmAndScenes format="tall" />
      </Folder>
      <Folder name="Characters">
        <Still id="Tibik-ModelSheet" component={TibikModelSheet} width={width} height={height} />
        <Still id="Karen-ModelSheet" component={KarenModelSheet} width={width} height={height} />
      </Folder>
      <Folder name="Sets">
        <Composition id="Cars-Set" component={CarSheet} durationInFrames={CAR_VIEWS.length} fps={FPS} width={width} height={height} />
        <Still id="Treppenhaus-Set" component={StairwellSheet} defaultProps={{ view: "flight" as const }} width={width} height={height} />
        <Still id="Props-Sheet" component={PropsSheet} width={width} height={height} />
      </Folder>
    </>
  );
};
