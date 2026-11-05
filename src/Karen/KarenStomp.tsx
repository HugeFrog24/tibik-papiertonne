import { Audio } from "@remotion/media";
import { useVideoConfig } from "remotion";
import { sfxSource } from "../sound/SoundCues";

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
    ? `flur/${THROUGH_THE_DOOR[name]}.wav`
    : room === "stairwell"
      ? `stairwell/${name}.wav`
      : `${name}.ogg`;

export const STOMP_RATE = 0.7;

export const stompFiles = (index: number, room: StompRoom) => ({
  step: stompFile(`footstep_concrete_00${index % 4}`, room),
  thud: stompFile("impactSoft_heavy_000", room),
});

export const KarenStomp: React.FC<{
  readonly frame: number;
  readonly index: number;
  readonly room?: StompRoom;
}> = ({ frame, index, room = "street" }) => {
  const { step, thud } = stompFiles(index, room);
  return (
    <>
      <Audio
        name={`Karen stomp ${index + 1}`}
        src={sfxSource(step)}
        from={frame}
        volume={1}
        playbackRate={STOMP_RATE}
      />
      <Audio
        name={`Karen stomp ${index + 1}: thud`}
        src={sfxSource(thud)}
        from={frame}
        volume={0.6}
        playbackRate={STOMP_RATE}
      />
    </>
  );
};

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
