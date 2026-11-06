import { Audio } from "@remotion/media";
import type { ComponentProps } from "react";

export const MIX = { headroom: 10 ** (-5 / 20) };

type AudioProps = ComponentProps<typeof Audio>;

const throughTheBus = (volume: AudioProps["volume"]): AudioProps["volume"] =>
  typeof volume === "function" ? (frame: number) => volume(frame) * MIX.headroom : (volume ?? 1) * MIX.headroom;

export const MixAudio = (props: AudioProps) => <Audio {...props} volume={throughTheBus(props.volume)} />;
