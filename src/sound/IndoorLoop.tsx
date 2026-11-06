import { MixAudio } from "./MixAudio";
import { Sequence, staticFile, useVideoConfig } from "remotion";

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
  const heard = (f: number) =>
    throughTheWalls(level(from + f / fps), indoors(from + f / fps));
  return (
    <Sequence from={Math.round(from * fps)} layout="none" name={name}>
      <Sequence from={-Math.round(startAt * fps)} layout="none">
        <MixAudio
          name={name}
          src={staticFile(`sfx/${loopFiles(file).open}`)}
          loop={!once}
          loopVolumeCurveBehavior="extend"
          volume={(f) => heard(f).outside}
        />
        <MixAudio
          name={`${name} (through the walls)`}
          src={staticFile(`sfx/${loopFiles(file).muffled}`)}
          loop={!once}
          loopVolumeCurveBehavior="extend"
          volume={(f) => heard(f).inside}
        />
      </Sequence>
    </Sequence>
  );
};
