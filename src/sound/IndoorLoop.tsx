import { Audio } from "@remotion/media";
import { staticFile } from "remotion";

export const throughTheWalls = (level: number, indoors: number) => ({
  outside: level * (1 - indoors),
  inside: level * indoors,
});

export const IndoorLoop: React.FC<{
  readonly name: string;
  readonly file: string;
  readonly level: (frame: number) => number;
  readonly indoors: (frame: number) => number;
}> = ({ name, file, level, indoors }) => (
  <>
    <Audio
      name={name}
      src={staticFile(`sfx/${file}.wav`)}
      loop
      loopVolumeCurveBehavior="extend"
      volume={(f) => throughTheWalls(level(f), indoors(f)).outside}
    />
    <Audio
      name={`${name} (through the walls)`}
      src={staticFile(`sfx/${file}-muffled.wav`)}
      loop
      loopVolumeCurveBehavior="extend"
      volume={(f) => throughTheWalls(level(f), indoors(f)).inside}
    />
  </>
);
