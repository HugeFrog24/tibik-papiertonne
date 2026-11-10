import { MixAudio } from "./MixAudio";
import { Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { renderFrame } from "../frameRate";

export const throughTheWalls = (level: number, indoors: number) => ({
  outside: level * (1 - indoors),
  inside: level * indoors,
});

export const loopFiles = (file: string) => ({
  open: `${file}.wav`,
  muffled: `${file}-muffled.wav`,
});

export const IndoorLoop: React.FC<{
  readonly name: string;
  readonly file: string;
  readonly level: (t: number) => number;
  readonly indoors: (t: number) => number;
  readonly from?: number;
  readonly startAt?: number;
  readonly once?: boolean;
}> = ({ name, file, level, indoors, from = 0, startAt = 0, once = false }) => {
  const { fps } = useVideoConfig();
  const t = useCurrentFrame() / fps;
  const heard = throughTheWalls(level(t), indoors(t));
  return (
    <Sequence from={renderFrame(from, fps)} layout="none" name={name}>
      <Sequence from={-renderFrame(startAt, fps)} layout="none">
        <MixAudio name={name} src={staticFile(`sfx/${loopFiles(file).open}`)} loop={!once} volume={heard.outside} />
        <MixAudio name={`${name} (through the walls)`} src={staticFile(`sfx/${loopFiles(file).muffled}`)} loop={!once} volume={heard.inside} />
      </Sequence>
    </Sequence>
  );
};
