import { easeUnit } from "../characters/scalar";
export type Speaker = "karen" | "tibik" | "phone" | "narrator";
export type Tone = "shout" | "calm" | "phone";
export type SpanOf = (line: Line) => readonly [number, number];

export const subtitled: SpanOf = (line) => [line.from, line.to];

export const speakingIn =
  (lines: readonly Line[], spanOf: SpanOf = subtitled) => (t: number, speaker: Speaker) =>
    lines.some((l) => {
      const [from, to] = spanOf(l);
      return l.speaker === speaker && t >= from && t <= to;
    });

export const SPEAKING_RAMP = 0.2;

export const speakingAmountIn =
  (lines: readonly Line[], spanOf: SpanOf = subtitled) => (t: number, speaker: Speaker) =>
    Math.max(
      0,
      ...lines
        .filter((l) => l.speaker === speaker)
        .map((l) => {
          const [from, to] = spanOf(l);
          return Math.min(easeUnit((t - from) / SPEAKING_RAMP), easeUnit((to - t) / SPEAKING_RAMP));
        }),
    );

export type Line = {
  readonly speaker: Speaker;
  readonly from: number;
  readonly to: number;
  readonly text: string;
  readonly name: string;
  readonly tone: Tone;
  readonly far?: true;
};
