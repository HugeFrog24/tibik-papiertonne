import { expect, test } from "vitest";
import { SPOKEN } from "../scenes/spokenLines";
import { clockOf } from "../scenes/clocks";
import { englishEdition } from "./edition";
import { SUBTITLE, SUBTITLE_BAR, SUBTITLE_SPLIT_SECONDS, SUBTITLE_WORDS, chunksOf, endsBound, wrapsInto } from "./subtitles";
import { textWidth, typeOf, wordsOf } from "./text";

const ENGLISH = SPOKEN.flatMap(({ key, lines }) => {
  const edition = englishEdition(key, lines, clockOf(key, "en"));
  return lines.map((line) => edition.get(line)!);
});

const FORMATS = ["wide", "tall"] as const;

const UNEVEN_CHUNKS = 1.2;

test("English lines are marked English, so they are cut into chunks by English rules", () => {
  expect(ENGLISH.every(({ line }) => line.language === "en")).toBe(true);
  expect(SUBTITLE_WORDS.de).toEqual(SUBTITLE.words);
  expect(SUBTITLE_WORDS.en).toEqual([3, 7]);
});

test.each(FORMATS)("%s: a split English line has 3-7 words a chunk where the time allows; every chunk lasts at least 1 s or its whole line, and fits the bar in at most two lines", (format) => {
  const bar = SUBTITLE_BAR[format];
  const problems = ENGLISH.flatMap(({ line }) => {
    const chunks = chunksOf(line, format);
    const short = line.to - line.from < SUBTITLE.minSeconds;
    const timeBound = line.to - line.from < Math.ceil(wordsOf(line.text).length / SUBTITLE_WORDS.en[1]) * SUBTITLE.minSeconds * UNEVEN_CHUNKS;
    return chunks.flatMap((c) => {
      const n = wordsOf(c.text).length;
      const { font, spacing } = typeOf(c.tone);
      return [
        n > SUBTITLE_WORDS.en[1] && chunks.length > 1 && !timeBound ? `${line.name}: "${c.text}" has ${n} words` : null,
        !short && c.to - c.from < SUBTITLE.minSeconds - 1e-9 ? `${line.name}: "${c.text}" shows ${(c.to - c.from).toFixed(2)} s` : null,
        c.lines.length > SUBTITLE.maxLines ? `${line.name}: "${c.text}" needs ${c.lines.length} lines` : null,
        ...c.lines.map((l) => (textWidth(l, font, bar.fontSize, spacing) > bar.maxWidth - 2 * bar.padding ? `${line.name}: "${l}" is wider than the bar` : null)),
      ].filter((p): p is string => p !== null);
    });
  });
  expect(problems).toEqual([]);
});

test.each(FORMATS)("%s: an English chunk reads at most 20 characters a second, unless its line is spoken faster still, when it stays up for all of its line's time", (format) => {
  const fast = ENGLISH.flatMap(({ line, speech }) => {
    const spoken = line.text.length / (speech[1] - speech[0]);
    return chunksOf(line, format)
      .filter((c) => c.text.length / (c.to - c.from) > Math.max(SUBTITLE.maxCps, spoken) + 1e-9)
      .map((c) => `${line.name}: "${c.text}" reads at ${(c.text.length / (c.to - c.from)).toFixed(1)} cps`);
  });
  expect(fast).toEqual([]);
});

test.each(FORMATS)("%s: an English chunk never ends on a word that leans on the next one, such as an article, a preposition, a conjunction or a possessive", (format) => {
  const dangling = ENGLISH.flatMap(({ line }) =>
    chunksOf(line, format)
      .slice(0, -1)
      .filter((c) => endsBound(c.text, "en"))
      .map((c) => `${line.name}: "${c.text}"`),
  );
  expect(dangling).toEqual([]);
});

test("short English lines stay whole: 'Have a nice day, Mrs. Schulz.' is one chunk", () => {
  const line = ENGLISH.find(({ line }) => line.text === "Have a nice day, Mrs. Schulz.")!.line;
  for (const format of FORMATS) expect(chunksOf(line, format).map((c) => c.text), format).toEqual(["Have a nice day, Mrs. Schulz."]);
});

test("an English chunk does not end on a helping verb: 'Your local hardware store' | 'will be happy to advise you' in 9:16, where the sentence is too long to stay whole", () => {
  const line = ENGLISH.find(({ line }) => line.text.startsWith("Your local hardware store"))!.line;
  expect(chunksOf(line, "tall").map((c) => c.text)).toEqual(["Your local hardware store", "will be happy to advise you", "on the available sizes and designs."]);
});

test.each(FORMATS)("%s: a quickly spoken English line that fits two lines of the bar stays one subtitle, split only where every chunk stays up at least 1.5 s (owner, 2026-11-11)", (format) => {
  const flicking = ENGLISH.flatMap(({ line }) => {
    const chunks = chunksOf(line, format);
    const fitsWhole = wrapsInto(line.text, line.tone, format) <= SUBTITLE.maxLines;
    return chunks.length > 1 && fitsWhole && chunks.some((c) => c.to - c.from < SUBTITLE_SPLIT_SECONDS.en - 1e-9) ? [`${line.name}: ${chunks.map((c) => `"${c.text}"`).join(" | ")}`] : [];
  });
  expect(flicking).toEqual([]);
  const neighbor = ENGLISH.find(({ line }) => line.text === "MY NEIGHBOR TOOK A BOX OUT OF THE TRASH!")!.line;
  expect(chunksOf(neighbor, format).map((c) => c.text)).toEqual(["MY NEIGHBOR TOOK A BOX OUT OF THE TRASH!"]);
});
