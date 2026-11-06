import { FRAME_SIZE } from "./frameRate";
import { Composition, Folder, Still } from "remotion";
import { Film } from "./Film";
import { FILM_FRAMES, FPS, PAPIERTONNEN_FRAMES, HAUSMUELL_FRAMES, KLINGELSTURM_FRAMES, NACHTRUHE_FRAMES, RUNDSCHREIBEN_FRAMES, TREPPENHAUS_FRAMES } from "./timeline";
import { Klingelsturm } from "./scenes/klingelsturm/Klingelsturm";
import { Nachtruhe } from "./scenes/nachtruhe/Nachtruhe";
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
        width={FRAME_SIZE.width}
        height={FRAME_SIZE.height}
      />
      <Folder name="Scenes">
        <Composition
          id="Treppenhaus"
          component={Treppenhaus}
          durationInFrames={TREPPENHAUS_FRAMES}
          fps={FPS}
          width={FRAME_SIZE.width}
          height={FRAME_SIZE.height}
        />
        <Composition
          id="Papiertonnen"
          component={Papiertonnen}
          durationInFrames={PAPIERTONNEN_FRAMES}
          fps={FPS}
          width={FRAME_SIZE.width}
          height={FRAME_SIZE.height}
        />
        <Composition
          id="Hausmuell"
          component={Hausmuell}
          durationInFrames={HAUSMUELL_FRAMES}
          fps={FPS}
          width={FRAME_SIZE.width}
          height={FRAME_SIZE.height}
        />
        <Composition id="Klingelsturm" component={Klingelsturm} durationInFrames={KLINGELSTURM_FRAMES} fps={FPS} width={FRAME_SIZE.width} height={FRAME_SIZE.height} />
        <Composition id="Nachtruhe" component={Nachtruhe} durationInFrames={NACHTRUHE_FRAMES} fps={FPS} width={FRAME_SIZE.width} height={FRAME_SIZE.height} />
        <Composition id="Rundschreiben" component={Rundschreiben} durationInFrames={RUNDSCHREIBEN_FRAMES} fps={FPS} width={FRAME_SIZE.width} height={FRAME_SIZE.height} />
      </Folder>
      <Folder name="Characters">
        <Still
          id="Tibik-ModelSheet"
          component={TibikModelSheet}
          width={FRAME_SIZE.width}
          height={FRAME_SIZE.height}
        />
        <Still id="Karen-ModelSheet" component={KarenModelSheet} width={FRAME_SIZE.width} height={FRAME_SIZE.height} />
      </Folder>
      <Folder name="Sets">
        <Composition id="Cars-Set" component={CarSheet} durationInFrames={CAR_VIEWS.length} fps={FPS} width={FRAME_SIZE.width} height={FRAME_SIZE.height} />
        <Still id="Fisheye-Test" component={StairwellSheet} defaultProps={{ view: "flight" as const, fisheye: true }} width={FRAME_SIZE.width} height={FRAME_SIZE.height} />
        <Still id="Treppenhaus-Set" component={StairwellSheet} defaultProps={{ view: "flight" as const }} width={FRAME_SIZE.width} height={FRAME_SIZE.height} />
        <Still id="Props-Sheet" component={PropsSheet} width={FRAME_SIZE.width} height={FRAME_SIZE.height} />
      </Folder>
    </>
  );
};
