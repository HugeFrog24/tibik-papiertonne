import TAKES from "../dialogue/takes.json";
import { spokenLength } from "../dialogue/speechSpan";
import { clockOf } from "./clocks";
import { HAUSMUELL_DURATION } from "./hausmuell/choreography";
import { CLICK, KEYS } from "./klingelsturm/calls";
import { SHUT } from "./klingelsturm/door";
import { takeIdOf, voiceOf, type Voice } from "./recordingScript";
import { SPOKEN } from "./spokenLines";

export const ENGLISH_FIT_FILE = "src/dialogue/englishFit.json";

export const FIT = { pause: 0.15, fastest: 1.31 } as const;

export type Fitted = { readonly from: number; readonly tempo: number };

type Deadline = { readonly at: number; readonly pause: number };

const BY: Readonly<Partial<Record<string, { readonly at: number; readonly pause?: number }>>> = {
  klingelsturm_07_tibik: { at: SHUT[0] },
  klingelsturm_11_karen: { at: KEYS.find((key) => key.key === "end")!.at },
  klingelsturm_16_leitstelle: { at: CLICK },
  hausmuell_13_karen: { at: HAUSMUELL_DURATION, pause: 0 },
};

const WORDS_END: Readonly<Record<string, number>> = { klingelsturm_01_tibik: 0.8 };

const MOVABLE: ReadonlySet<Voice> = new Set(["anrufbeantworter"]);

export const movable = (voice: Voice) => MOVABLE.has(voice);

type Measured = { readonly speech: readonly (readonly number[])[] };

const takeIn = (language: "de" | "en", id: string) => (TAKES[language] as Readonly<Record<string, Measured>>)[id];

export const wordsOf = (id: string) => {
  const take = takeIn("en", id);
  return id in WORDS_END ? WORDS_END[id] - take.speech[0][0] : spokenLength(take);
};

const ordered = () => SPOKEN.map(({ key, lines }) => ({ key, lines: [...lines].sort((a, b) => a.from - b.from) }));

export const deadlineOf = (id: string): Deadline | undefined => {
  for (const { lines } of ordered()) {
    const i = lines.findIndex((line) => takeIdOf(line) === id);
    if (i < 0) continue;
    const line = lines[i];
    const next = lines.at(i + 1)?.from ?? Infinity;
    const by = BY[id];
    const at = Math.min(next, by?.at ?? Infinity);
    if (!Number.isFinite(at)) return undefined;
    const germanPause = at - (line.from + spokenLength(takeIn("de", id)));
    return { at, pause: by?.pause ?? Math.min(FIT.pause, germanPause) };
  }
  return undefined;
};

const round = (v: number, step: number) => Math.round(v / step) * step;

export const englishFit = (): Record<string, Fitted> => {
  const fit: Record<string, Fitted> = {};
  for (const { key, lines } of ordered()) {
    const clock = clockOf(key, "en");
    lines.forEach((line, i) => {
      const id = takeIdOf(line)!;
      const before = lines.at(i - 1);
      const beforeId = before && takeIdOf(before)!;
      if (i > 0 && MOVABLE.has(voiceOf(line)) && before && beforeId && MOVABLE.has(voiceOf(before))) {
        const germanPause = line.from - (before.from + spokenLength(takeIn("de", beforeId)));
        fit[id] = { from: Number(round(fit[beforeId].from + wordsOf(beforeId) + germanPause, 0.001).toFixed(3)), tempo: 1 };
        return;
      }
      const deadline = MOVABLE.has(voiceOf(line)) ? undefined : deadlineOf(id);
      const room = deadline ? clock.editAt(deadline.at) - deadline.pause - clock.editAt(line.from) : Infinity;
      const tempo = Math.max(1, Math.ceil((wordsOf(id) / room) * 1e4 - 1e-6) / 1e4);
      fit[id] = { from: line.from, tempo };
    });
  }
  return Object.fromEntries(Object.entries(fit).sort(([a], [b]) => a.localeCompare(b)));
};
