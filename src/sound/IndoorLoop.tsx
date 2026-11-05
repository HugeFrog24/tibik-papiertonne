import { Audio } from "@remotion/media";
import { Sequence, staticFile, useVideoConfig } from "remotion";

export const throughTheWalls = (level: number, indoors: number) => ({
  outside: level * (1 - indoors),
  inside: level * indoors,
});

export const IndoorLoop: React.FC<{
  readonly name: string;
  readonly file: string;
  readonly level: (frame: number) => number;
  readonly indoors: (frame: number) => number;
  readonly startAt?: number;
  readonly once?: boolean;
}> = ({ name, file, level, indoors, startAt = 0, once = false }) => {
  const heard = (f: number) => throughTheWalls(level(f), indoors(f));
  return (
    <Sequence from={-Math.round(startAt * useVideoConfig().fps)} layout="none" name={name}>
      <Audio
        name={name}
        src={staticFile(`sfx/${file}.wav`)}
        loop={!once}
        loopVolumeCurveBehavior="extend"
        volume={(f) => heard(f).outside}
      />
      <Audio
        name={`${name} (through the walls)`}
        src={staticFile(`sfx/${file}-muffled.wav`)}
        loop={!once}
        loopVolumeCurveBehavior="extend"
        volume={(f) => heard(f).inside}
      />
    </Sequence>
  );
};
