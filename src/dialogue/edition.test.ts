import { expect, test } from "vitest";
import TAKES from "./takes.json";
import ENGLISH_FIT from "./englishFit.json";
import { spokenLength } from "./speechSpan";
import { englishEdition } from "./edition";
import { ENGLISH_DRAFT } from "../scenes/englishDraft";
import { SPOKEN } from "../scenes/spokenLines";
import { takeIdOf } from "../scenes/recordingScript";
import { clockOf } from "../scenes/clocks";
import { playedTakeOf } from "../scenes/voices";
import { spokenSpans } from "./voiced";

const editions = () => SPOKEN.map(({ key, lines }) => ({ key, lines, clock: clockOf(key, "en"), edition: englishEdition(key, lines, clockOf(key, "en")) }));

test("every spoken line has its English edition, knowing its own take: the same one the recording script files it under", () => {
  for (const { lines, edition } of editions()) {
    for (const line of lines) {
      const english = edition.get(line)!;
      expect(english.line.take, line.name).toBe(takeIdOf(line));
      expect(takeIdOf(english.line), line.name).toBe(takeIdOf(line));
    }
  }
  expect(editions().reduce((n, { edition }) => n + edition.size, 0)).toBe(Object.keys(TAKES.en).length);
});

test("an English line reads its English draft, by the same speaker in the same tone", () => {
  for (const { lines, edition } of editions()) {
    for (const line of lines) {
      const { line: english } = edition.get(line)!;
      expect(english.text, line.name).toBe(ENGLISH_DRAFT[line.text]);
      expect([english.speaker, english.tone, english.name], line.name).toEqual([line.speaker, line.tone, line.name]);
    }
  }
});

test("an English line starts in the film where its fitted take starts, and its speech runs as long as the take as played", () => {
  for (const { lines, edition, clock } of editions()) {
    for (const line of lines) {
      const id = takeIdOf(line)!;
      const { line: english, speech } = edition.get(line)!;
      expect(english.from, id).toBeCloseTo(clock.editAt((ENGLISH_FIT as Record<string, { from: number }>)[id].from), 9);
      expect(speech[0], id).toBeCloseTo(english.from, 9);
      expect(speech[1] - speech[0], id).toBeCloseTo(spokenLength(playedTakeOf("en", id)!), 9);
    }
  }
});

test("an English subtitle stays up while its line is spoken, at least as long as the German one, and is gone before the next English line", () => {
  for (const { lines, edition, clock } of editions()) {
    const ordered = [...lines].sort((a, b) => a.from - b.from);
    ordered.forEach((line, i) => {
      const { line: english, speech } = edition.get(line)!;
      expect(english.to, line.name).toBeGreaterThanOrEqual(Math.min(speech[1], ordered[i + 1] ? edition.get(ordered[i + 1])!.line.from : Infinity) - 1e-9);
      const next = ordered.at(i + 1);
      if (next) expect(english.to, line.name).toBeLessThanOrEqual(edition.get(next)!.line.from + 1e-9);
      else expect(english.to, line.name).toBeGreaterThanOrEqual(clock.editAt(line.to) - 1e-9);
    });
  }
});

test("in English a line is spoken for as long as its English take plays, in the film's time; in German as before", () => {
  for (const { key, lines, edition } of editions()) {
    const english = spokenSpans(key, lines, "en", clockOf(key, "en"));
    const german = spokenSpans(key, lines);
    const before = spokenSpans(key, lines, "de", clockOf(key, "de"));
    for (const line of lines) {
      expect(english(line), line.name).toEqual(edition.get(line)!.speech);
      expect(before(line), line.name).toEqual(german(line));
    }
  }
});
