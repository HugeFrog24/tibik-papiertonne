import { easeUnit } from "../characters/scalar";
export type Speaker = "karen" | "tibik" | "phone";
export type Tone = "shout" | "calm" | "phone";
export type Box = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
  readonly fontSize: number;
};

export const bubbleBox = (
  left: number,
  top: number,
  width: number,
  height: number,
  fontSize: number,
): Box => ({ left, top, width, height, fontSize });
export const speakingIn =
  (lines: readonly Line[]) => (t: number, speaker: Speaker) =>
    lines.some((l) => l.speaker === speaker && t >= l.from && t <= l.to);

export const SPEAKING_RAMP = 0.2;

export const speakingAmountIn =
  (lines: readonly Line[]) => (t: number, speaker: Speaker) =>
    Math.max(
      0,
      ...lines
        .filter((l) => l.speaker === speaker)
        .map((l) =>
          Math.min(
            easeUnit((t - l.from) / SPEAKING_RAMP),
            easeUnit((l.to - t) / SPEAKING_RAMP),
          ),
        ),
    );

export type Line = {
  readonly speaker: Speaker;
  readonly from: number;
  readonly to: number;
  readonly text: string;
  readonly name: string;
  readonly tone: Tone;
  readonly box: Box;
};
