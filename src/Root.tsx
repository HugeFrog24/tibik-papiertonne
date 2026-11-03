import { Composition, Folder, Still } from "remotion";
import { FPS, Film, PAPIERTONNEN_FRAMES, HAUSMUELL_FRAMES } from "./Film";
import { KarenModelSheet } from "./Karen/KarenModelSheet";
import { StairwellSheet } from "./building/StairwellSheet";
import { Papiertonnen } from "./scenes/papiertonnen/Papiertonnen";
import { Hausmuell } from "./scenes/hausmuell/Hausmuell";
import { TibikModelSheet } from "./Tibik/TibikModelSheet";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Film"
        component={Film}
        durationInFrames={PAPIERTONNEN_FRAMES + HAUSMUELL_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Folder name="Scenes">
        <Composition
          id="Papiertonnen"
          component={Papiertonnen}
          durationInFrames={PAPIERTONNEN_FRAMES}
          fps={FPS}
          width={1920}
          height={1080}
        />
        <Composition
          id="Hausmuell"
          component={Hausmuell}
          durationInFrames={HAUSMUELL_FRAMES}
          fps={FPS}
          width={1920}
          height={1080}
        />
      </Folder>
      <Folder name="Characters">
        <Still
          id="Tibik-ModelSheet"
          component={TibikModelSheet}
          width={1920}
          height={1080}
        />
        <Still id="Karen-ModelSheet" component={KarenModelSheet} width={1920} height={1080} />
      </Folder>
      <Folder name="Sets">
        <Still id="Treppenhaus-Set" component={StairwellSheet} defaultProps={{ view: "flight" as const }} width={1920} height={1080} />
      </Folder>
    </>
  );
};
