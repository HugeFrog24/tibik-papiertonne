import { FPS } from "../frameRate";
import type { Line, SpanOf } from "./line";
import { takeId } from "./takeIds";
import TAKES from "./takes.json";

export const MOUTH_LEAD = 2 / FPS;

type Measured = { readonly speech: readonly (readonly number[])[] };

export const spokenSpans = (scene: string, lines: readonly Line[]): SpanOf => {
  const ordered = [...lines].sort((a, b) => a.from - b.from);
  const known = new Map<Line, readonly [number, number]>();
  const spanOf = (line: Line): readonly [number, number] => {
    const take = (TAKES.de as Readonly<Partial<Record<string, Measured>>>)[takeId(scene, ordered.indexOf(line), line.speaker)];
    if (take?.speech.length !== 1) return [line.from, line.to];
    return [line.from, line.from + take.speech[0][1] - take.speech[0][0]];
  };
  return (line) => {
    const span = known.get(line) ?? spanOf(line);
    known.set(line, span);
    return span;
  };
};

export const mouthLeads =
  (spanOf: SpanOf): SpanOf =>
  (line) => {
    const [from, to] = spanOf(line);
    return [from - MOUTH_LEAD, to];
  };
