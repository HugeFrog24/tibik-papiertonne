import { TIMELINE_FPS } from "../frameRate";
import type { Line, SpanOf } from "./line";
import { takeId } from "./takeIds";
import TAKES from "./takes.json";
import type { Language } from "../language";
import { STEADY, type SceneClock } from "../sceneClock";
import { englishEdition } from "./edition";

export const MOUTH_LEAD = 2 / TIMELINE_FPS;

type Measured = { readonly speech: readonly (readonly number[])[] };

export const spokenSpans = (scene: string, lines: readonly Line[], language: Language = "de", clock: SceneClock = STEADY): SpanOf => {
  const ordered = [...lines].sort((a, b) => a.from - b.from);
  const known = new Map<Line, readonly [number, number]>();
  const spanOf = (line: Line): readonly [number, number] => {
    if (language === "en") return englishEdition(scene, lines, clock).get(line)?.speech ?? [clock.editAt(line.from), clock.editAt(line.to)];
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
