import { Composition, Folder, Still } from "remotion";
import { Film } from "./Film";
import { FILM_FRAMES, FPS, PAPIERTONNEN_FRAMES, HAUSMUELL_FRAMES, KLINGELSTURM_FRAMES, RUNDSCHREIBEN_FRAMES, TREPPENHAUS_FRAMES } from "./timeline";
import { Klingelsturm } from "./scenes/klingelsturm/Klingelsturm";
import { Rundschreiben } from "./scenes/rundschreiben/Rundschreiben";
import { KarenModelSheet } from "./Karen/KarenModelSheet";
import { StairwellSheet } from "./building/StairwellSheet";
import { Papiertonnen } from "./scenes/papiertonnen/Papiertonnen";
import { Hausmuell } from "./scenes/hausmuell/Hausmuell";
import { Treppenhaus } from "./scenes/treppenhaus/Treppenhaus";
import { TibikModelSheet } from "./Tibik/TibikModelSheet";
import { CarSheet } from "./street/CarSheet";
import { CAR_VIEWS } from "./street/carViews";
import { PropsSheet } from "./props/PropsSheet";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Film"
        component={Film}
        durationInFrames={FILM_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Folder name="Scenes">
        <Composition
          id="Treppenhaus"
          component={Treppenhaus}
          durationInFrames={TREPPENHAUS_FRAMES}
          fps={FPS}
          width={1920}
          height={1080}
        />
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
        <Composition id="Klingelsturm" component={Klingelsturm} durationInFrames={KLINGELSTURM_FRAMES} fps={FPS} width={1920} height={1080} />
        <Composition id="Rundschreiben" component={Rundschreiben} durationInFrames={RUNDSCHREIBEN_FRAMES} fps={FPS} width={1920} height={1080} />
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
        <Composition id="Cars-Set" component={CarSheet} durationInFrames={CAR_VIEWS.length} fps={FPS} width={1920} height={1080} />
        <Still id="Fisheye-Test" component={StairwellSheet} defaultProps={{ view: "flight" as const, fisheye: true }} width={1920} height={1080} />
        <Still id="Treppenhaus-Set" component={StairwellSheet} defaultProps={{ view: "flight" as const }} width={1920} height={1080} />
        <Still id="Props-Sheet" component={PropsSheet} width={1920} height={1080} />
      </Folder>
    </>
  );
};
