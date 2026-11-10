import { Audio } from "@remotion/media";
import { createContext, useContext, type ComponentProps } from "react";
import { decibelGain } from "../characters/scalar";

export const MIX = { headroom: decibelGain(-5) };

export const MixGain = createContext(1);

type AudioProps = ComponentProps<typeof Audio>;

export const throughTheBus = (volume: AudioProps["volume"], gain = 1): NonNullable<AudioProps["volume"]> =>
  typeof volume === "function" ? (frame: number) => volume(frame) * MIX.headroom * gain : (volume ?? 1) * MIX.headroom * gain;

export const MixAudio = (props: AudioProps) => <Audio {...props} volume={throughTheBus(props.volume, useContext(MixGain))} />;
