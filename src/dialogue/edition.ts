import TAKES from "./takes.json";
import ENGLISH_FIT from "./englishFit.json";
import { ENGLISH_DRAFT } from "../scenes/englishDraft";
import type { Line } from "./line";
import { spokenLength } from "./speechSpan";
import { STEADY, type SceneClock } from "../sceneClock";
import type { Language } from "../language";

type Measured = { readonly speech: readonly (readonly number[])[] };
type Fitted = { readonly from: number; readonly tempo: number };

export type Edited = { readonly line: Line; readonly speech: readonly [number, number] };

const idAt = (ids: readonly string[], scene: string, index: number) => {
  const prefix = `${scene}_${String(index + 1).padStart(2, "0")}_`;
  return ids.find((id) => id.startsWith(prefix));
};

const ENGLISH_IDS = Object.keys(TAKES.en);
const GERMAN = TAKES.de as Readonly<Partial<Record<string, Measured>>>;
const ENGLISH = TAKES.en as Readonly<Partial<Record<string, Measured>>>;
const FIT = ENGLISH_FIT as Readonly<Partial<Record<string, Fitted>>>;

const made = new Map<string, Map<SceneClock, ReadonlyMap<Line, Edited>>>();

const edit = (scene: string, all: readonly Line[], clock: SceneClock): ReadonlyMap<Line, Edited> => {
  const ordered = [...all].sort((a, b) => a.from - b.from);
  const starts = ordered.map((line, i) => {
    const id = idAt(ENGLISH_IDS, scene, i);
    const fit = id === undefined ? undefined : FIT[id];
    const take = id === undefined ? undefined : ENGLISH[id];
    const from = clock.editAt(fit?.from ?? line.from);
    const spoken = take && fit ? spokenLength(take) / fit.tempo : line.to - line.from;
    return { line, id, from, speechEnd: from + spoken };
  });
  return new Map(
    starts.map(({ line, id, from, speechEnd }, i) => {
      const german = id === undefined ? undefined : GERMAN[id];
      const margin = german ? Math.max(0, line.to - (line.from + spokenLength(german))) : 0;
      const next = starts.at(i + 1)?.from ?? Infinity;
      const to = Math.min(next, Math.max(clock.editAt(line.to), speechEnd + margin));
      const english: Line = { ...line, from, to, text: ENGLISH_DRAFT[line.text] ?? line.text, language: "en", ...(id === undefined ? {} : { take: id }) };
      return [line, { line: english, speech: [from, speechEnd] as const }];
    }),
  );
};

export const englishEdition = (scene: string, all: readonly Line[], clock: SceneClock): ReadonlyMap<Line, Edited> => {
  const byClock = made.get(scene) ?? new Map<SceneClock, ReadonlyMap<Line, Edited>>();
  made.set(scene, byClock);
  const known = byClock.get(clock) ?? edit(scene, all, clock);
  byClock.set(clock, known);
  return known;
};

export const linesIn =
  (language: Language, scene: string, all: readonly Line[], clock: SceneClock = STEADY) =>
  (lines: readonly Line[]): readonly Line[] =>
    language === "de" ? lines : lines.map((line) => englishEdition(scene, all, clock).get(line)?.line ?? line);
