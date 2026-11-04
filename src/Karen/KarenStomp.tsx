import { Audio } from "@remotion/media";
import { staticFile, useVideoConfig } from "remotion";

export type StompRoom = "street" | "stairwell" | "door";

const THROUGH_THE_DOOR: Record<string, string> = {
  impactSoft_heavy_000: "thud-door",
  footstep_concrete_000: "footstep-door-0",
  footstep_concrete_001: "footstep-door-1",
  footstep_concrete_002: "footstep-door-2",
  footstep_concrete_003: "footstep-door-3",
};

const stompFile = (name: string, room: StompRoom) =>
  room === "door"
    ? staticFile(`sfx/flur/${THROUGH_THE_DOOR[name]}.wav`)
    : room === "stairwell"
      ? staticFile(`sfx/stairwell/${name}.wav`)
      : staticFile(`sfx/${name}.ogg`);

export const KarenStomp: React.FC<{
  readonly frame: number;
  readonly index: number;
  readonly room?: StompRoom;
}> = ({ frame, index, room = "street" }) => (
  <>
    <Audio
      name={`Karen stomp ${index + 1}`}
      src={stompFile(`footstep_concrete_00${index % 4}`, room)}
      from={frame}
      volume={1}
      playbackRate={0.7}
    />
    <Audio
      name={`Karen stomp ${index + 1}: thud`}
      src={stompFile("impactSoft_heavy_000", room)}
      from={frame}
      volume={0.6}
      playbackRate={0.7}
    />
  </>
);

export const KarenStomps: React.FC<{
  readonly times: readonly number[];
  readonly room?: StompRoom;
  readonly roomAt?: (t: number) => StompRoom;
}> = ({ times, room, roomAt }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {times.map((t, i) => (
        <KarenStomp
          key={t}
          frame={Math.round(t * fps)}
          index={i}
          room={roomAt ? roomAt(t) : room}
        />
      ))}
    </>
  );
};
