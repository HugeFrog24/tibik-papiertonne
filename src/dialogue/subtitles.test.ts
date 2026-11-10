import { expect, test } from "vitest";
import { ALL_SPOKEN_LINES, SPOKEN } from "../scenes/spokenLines";
import { textWidth, typeOf } from "./text";
import type { Line } from "./line";
import { BINDS_TO_THE_NEXT, CLAUSE_END, SPEAKER_INK, SUBTITLE, SUBTITLE_BAR, barRect, chunkAt, chunksOf, endsBound } from "./subtitles";
import { wordsOf } from "./text";
import { luminance } from "../toon/colourChecks";
import { FORMATS } from "../frameRate";

const ALL_LINES: readonly Line[] = ALL_SPOKEN_LINES;
const FORMATS_TESTED = ["wide", "tall"] as const;
const cps = (c: { text: string; from: number; to: number }) => c.text.length / (c.to - c.from);
const UNEVEN_CHUNKS = 1.2;

test.each(FORMATS_TESTED)("%s: every dialogue line in the film is cut into chunks that cover it in order, inside its span, never overlapping", (format) => {
  for (const line of ALL_LINES) {
    const chunks = chunksOf(line, format);
    expect(chunks.map((c) => c.text).join(" ")).toBe(wordsOf(line.text).join(" "));
    expect(chunks[0].from).toBeCloseTo(line.from, 9);
    expect(chunks[chunks.length - 1].to).toBeCloseTo(line.to, 9);
    chunks.forEach((c, i) => {
      expect(c.to).toBeGreaterThan(c.from);
      if (i > 0) expect(c.from).toBeCloseTo(chunks[i - 1].to, 9);
      expect(c.line).toBe(line.name);
      expect(c.speaker).toBe(line.speaker);
      expect(c.tone).toBe(line.tone);
    });
  }
});

test.each(FORMATS_TESTED)("%s: each chunk has 3-5 words where the time and the bar allow, lasts at least 1 s (or its whole line), reads at most 20 characters a second, and fits the bar in at most two lines", (format) => {
  const bar = SUBTITLE_BAR[format];
  const problems = ALL_LINES.flatMap((line) => {
    const chunks = chunksOf(line, format);
    const short = line.to - line.from < SUBTITLE.minSeconds;
    const timeBound = line.to - line.from < Math.ceil(wordsOf(line.text).length / SUBTITLE.words[1]) * SUBTITLE.minSeconds * UNEVEN_CHUNKS;
    return chunks.flatMap((c) => {
      const n = wordsOf(c.text).length;
      const { font, spacing } = typeOf(c.tone);
      return [
        n > SUBTITLE.words[1] && !timeBound ? `${line.name}: "${c.text}" has ${n} words` : null,
        n < SUBTITLE.words[0] && wordsOf(line.text).length >= SUBTITLE.words[0] && chunks.length > 1 && chunks.length <= Math.ceil(wordsOf(line.text).length / SUBTITLE.words[1]) ? `${line.name}: "${c.text}" has only ${n} words` : null,
        !short && c.to - c.from < SUBTITLE.minSeconds - 1e-9 ? `${line.name}: "${c.text}" shows ${(c.to - c.from).toFixed(2)} s` : null,
        cps(c) > SUBTITLE.maxCps + 1e-9 ? `${line.name}: "${c.text}" reads at ${cps(c).toFixed(1)} cps` : null,
        c.lines.length > SUBTITLE.maxLines ? `${line.name}: "${c.text}" needs ${c.lines.length} lines` : null,
        c.lines.join(" ") !== c.text ? `${line.name}: "${c.text}" wraps inside a word` : null,
        ...c.lines.map((l) => (textWidth(l, font, bar.fontSize, spacing) > bar.maxWidth - 2 * bar.padding ? `${line.name}: "${l}" is wider than the bar` : null)),
      ].filter((p): p is string => p !== null);
    });
  });
  expect(problems).toEqual([]);
});

test("long words are never split: 'Haben Sie eine Weisungsbefugnis?' breaks only between words", () => {
  const line = ALL_LINES.find((l) => l.text.includes("Weisungsbefugnis"))!;
  for (const format of FORMATS_TESTED) {
    const parts = chunksOf(line, format).flatMap((c) => c.lines.flatMap(wordsOf));
    expect(parts).toEqual(wordsOf(line.text));
  }
});

test.each(FORMATS_TESTED)("%s: the bar shows at most one chunk at any moment, and only during its line", (format) => {
  const end = Math.max(...ALL_LINES.map((l) => l.to)) + 1;
  for (const lines of SPOKEN.map((scene) => scene.lines)) {
    for (let t = 0; t <= end; t += 1 / 60) {
      const speaking = lines.find((l) => t >= l.from && t < l.to);
      const chunk = chunkAt(lines, t, format);
      expect(chunk?.line ?? null).toBe(speaking?.name ?? null);
      if (chunk) expect(t >= chunk.from && t < chunk.to).toBe(true);
    }
  }
});

const ABOVE_THE_TARGET = 20;

test("chunks reading faster than the 17 characters a second target are counted, so the count can only come down; the letter's now keep Tibik's own reading pace", () => {
  const fast = ALL_LINES.flatMap((line) => chunksOf(line, "wide")).filter((c) => cps(c) > SUBTITLE.targetCps + 1e-9);
  expect(fast.length, fast.map((c) => `${c.line}: "${c.text}" ${cps(c).toFixed(1)} cps`).join("; ")).toBeLessThanOrEqual(ABOVE_THE_TARGET);
});

const rgbOf = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const PALE = { chroma: 0.08, luminance: 0.75 };
const LARGE_TYPE = { wide: 64, tall: 66 };

test("subtitle type is large: at least 64 px in 16:9 and 66 px in 9:16 (the longest compound still fits two lines of the narrower bar)", () => {
  expect(SUBTITLE_BAR.wide.fontSize).toBeGreaterThanOrEqual(LARGE_TYPE.wide);
  expect(SUBTITLE_BAR.tall.fontSize).toBeGreaterThanOrEqual(LARGE_TYPE.tall);
});

test("speaker colours are pale tints, easy to read: near white, yet Tibik's still leans green and Karen's lilac", () => {
  for (const [speaker, { color }] of Object.entries(SPEAKER_INK)) {
    const rgb = rgbOf(color);
    expect(Math.max(...rgb) - Math.min(...rgb), `${speaker} ${color}`).toBeLessThanOrEqual(PALE.chroma);
    expect(luminance(color), `${speaker} ${color}`).toBeGreaterThanOrEqual(PALE.luminance);
  }
  const [tr, tg, tb] = rgbOf(SPEAKER_INK.tibik.color);
  const [kr, kg, kb] = rgbOf(SPEAKER_INK.karen.color);
  expect(tg).toBeGreaterThan(Math.max(tr, tb));
  expect(Math.min(kr, kb)).toBeGreaterThan(kg);
});

test("the letter, read in Tibik's inner voice, is subtitled in his green and in italics, set apart from what he says aloud", () => {
  expect(SPEAKER_INK.narrator).toEqual({ color: SPEAKER_INK.tibik.color, italic: true });
  expect(SPEAKER_INK.tibik.italic).toBe(false);
});

const TALL_UI = { right: 140, bottom: 480 };

test("in the tall format the bar keeps clear of the platforms' right-hand button column and the caption area along the bottom", () => {
  const { centerX, maxWidth, bottom } = SUBTITLE_BAR.tall;
  expect(centerX + maxWidth / 2).toBeLessThanOrEqual(FORMATS.tall.width - TALL_UI.right);
  expect(centerX - maxWidth / 2).toBeGreaterThanOrEqual(TALL_UI.right);
  expect(bottom).toBeLessThanOrEqual(FORMATS.tall.height - TALL_UI.bottom);
});

test.each(FORMATS_TESTED)("%s: a phrase that needs two lines breaks after a comma or clause end when that is nearly as even as the most even break, otherwise where they come out most even, so no word is left alone below a full line", (format) => {
  const room = SUBTITLE_BAR[format].maxWidth - 2 * SUBTITLE_BAR[format].padding;
  const uneven = ALL_LINES.flatMap((line) => chunksOf(line, format))
    .filter((c) => c.lines.length === 2)
    .flatMap((c) => {
      const { font, spacing } = typeOf(c.tone);
      const width = (text: string) => textWidth(text, font, SUBTITLE_BAR[format].fontSize, spacing);
      const parts = wordsOf(c.text);
      const widest = (lines: readonly string[]) => Math.max(...lines.map(width));
      const fitting = parts.slice(1).map((_, i) => [parts.slice(0, i + 1).join(" "), parts.slice(i + 1).join(" ")]).filter((pair) => widest(pair) <= room);
      const best = Math.min(...fitting.map(widest));
      const nearlyEven = fitting.filter((pair) => CLAUSE_END.test(pair[0]) && widest(pair) <= best * SUBTITLE.clauseBreakSlack);
      const chosen = widest(c.lines);
      const ok = nearlyEven.length > 0 ? CLAUSE_END.test(c.lines[0]) && chosen <= best * SUBTITLE.clauseBreakSlack : chosen <= best + 1e-9;
      return ok ? [] : [`${c.line}: "${c.lines.join(" / ")}"`];
    });
  expect(uneven).toEqual([]);
});

test("in the tall format 'Schönen Tag noch, Frau Schulz.' breaks at the comma", () => {
  const line = ALL_LINES.find((l) => l.text === "Schönen Tag noch, Frau Schulz.")!;
  expect(chunksOf(line, "tall").map((c) => c.lines)).toEqual([["Schönen Tag noch,", "Frau Schulz."]]);
});

test.each(FORMATS_TESTED)("%s: lines are wrapped with room to spare, since the browser may set the type a little wider than its metrics, and the bar measured for the face checks allows for it", (format) => {
  const bar = SUBTITLE_BAR[format];
  for (const c of ALL_LINES.flatMap((line) => chunksOf(line, format))) {
    const { font, spacing } = typeOf(c.tone);
    const widest = Math.max(...c.lines.map((l) => textWidth(l, font, bar.fontSize, spacing)));
    expect(widest, c.text).toBeLessThanOrEqual((bar.maxWidth - 2 * bar.padding) * SUBTITLE.typeSlack);
    expect(barRect(c, format).width, c.text).toBeGreaterThanOrEqual(widest / SUBTITLE.typeSlack + 2 * bar.padding - 1e-9);
  }
});

test.each(FORMATS_TESTED)("%s: no two subtitles in a row look the same, so the bar always visibly changes", (format) => {
  for (const lines of SPOKEN.map((scene) => scene.lines)) {
    const shown = lines.flatMap((l) => chunksOf(l, format)).map((c) => c.lines.join(" / "));
    shown.slice(1).forEach((text, i) => { expect(text, `after "${shown[i]}"`).not.toBe(shown[i]); });
  }
});

const SPLIT_ONLY_ONE_WAY = ["Phone: Sprechzeiten"];

test.each(FORMATS_TESTED)("%s: no subtitle chunk ends on a word that binds to the next (an article, a preposition, a conjunction or a possessive), so a phrase is never split from its noun, except a six-word line the three-to-five-word rule can only split three and three", (format) => {
  const dangling = ALL_LINES.flatMap((line) => chunksOf(line, format).slice(0, -1))
    .filter((chunk) => endsBound(chunk.text))
    .map((chunk) => chunk.line);
  expect(dangling.filter((line) => !SPLIT_ONLY_ONE_WAY.includes(line))).toEqual([]);
  for (const name of SPLIT_ONLY_ONE_WAY) {
    const line = ALL_LINES.find((l) => l.name === name)!;
    expect(wordsOf(line.text).length, name).toBe(6);
    expect(chunksOf(line, format).map((chunk) => wordsOf(chunk.text).length), name).toEqual([3, 3]);
  }
});

test.each(FORMATS_TESTED)("%s: a line whose clauses are each a phrase of three to five words is cut at its clauses, as the letter's salutation is", (format) => {
  const salutation = ALL_SPOKEN_LINES.find((line) => line.text.startsWith("Sehr geehrte"))!;
  expect(chunksOf(salutation, format).map((chunk) => chunk.text)).toEqual(["Sehr geehrte Daminnen,", "sehr geehrte Herrinnen,", "sehr geehrter Tibik,"]);
  const line: Line = { speaker: "tibik", from: 0, to: 4, text: "Ich gehe jetzt nach Hause, und du bleibst hier.", name: "probe", tone: "calm" };
  expect(chunksOf(line, format).map((chunk) => chunk.text)).toEqual(["Ich gehe jetzt nach Hause,", "und du bleibst hier."]);
});

test.each(FORMATS_TESTED)("%s: where a phrase can end at a comma it does, ahead of making the phrases more even", (format) => {
  const line = ALL_SPOKEN_LINES.find((l) => l.text.startsWith("Sollten Sie einen Karton"))!;
  expect(chunksOf(line, format)[0].text).toBe("Sollten Sie einen Karton benötigen,");
});

test.each(FORMATS_TESTED)("%s: when the best-scoring split would make a phrase too short to read, the next best one is taken rather than one long chunk", (format) => {
  const line: Line = { speaker: "tibik", from: 0, to: 3.5, text: "Er sagt: „Nein.“ Dann geht er jetzt endlich aus dem Haus.", name: "probe", tone: "calm" };
  const chunks = chunksOf(line, format);
  expect(chunks.length).toBeGreaterThan(1);
  for (const chunk of chunks) expect(chunk.to - chunk.from, chunk.text).toBeGreaterThanOrEqual(SUBTITLE.minSeconds - 1e-9);
});

test("the words a phrase hangs from include two-part prepositions, contractions, subordinating conjunctions, negating articles and plural possessives", () => {
  for (const word of ["außerhalb", "innerhalb", "statt", "gegenüber", "außer", "beim", "ans", "aufs", "fürs", "ums", "übers", "sondern", "bevor", "nachdem", "damit", "obwohl", "sobald", "falls", "sowie", "kein", "keine", "keinen", "keinem", "keiner", "keines", "unser", "unserer", "unserem", "euer", "eure"])
    expect(BINDS_TO_THE_NEXT.has(word), word).toBe(true);
});

test.each(FORMATS_TESTED)("%s: a line takes one more phrase rather than end one on a word that binds to the next, when the time allows it", (format) => {
  const line: Line = { speaker: "tibik", from: 0, to: 4, text: "Wohnung Nr. 12 hat den Karton aus der Tonne genommen.", name: "probe", tone: "calm" };
  const chunks = chunksOf(line, format);
  for (const chunk of chunks.slice(0, -1)) expect(endsBound(chunk.text), chunk.text).toBe(false);
  for (const chunk of chunks) expect(wordsOf(chunk.text).length, chunk.text).toBeLessThanOrEqual(SUBTITLE.words[1]);
});

test.each(FORMATS_TESTED)("%s: avoiding a phrase that ends on a binding word costs at most one more phrase, and never leaves a phrase of a single word", (format) => {
  for (const text of ["den heute dem von Hund nach.", "Ich gehe mit dem Hund nach draußen.", "Ich stelle den Karton gleich wieder neben die blaue Tonne zurück.", "auf zurück nach dem Haus gleich."]) {
    const chunks = chunksOf({ speaker: "tibik", from: 0, to: 6, text, name: text, tone: "calm" }, format);
    expect(chunks.length, text).toBeLessThanOrEqual(Math.ceil(wordsOf(text).length / SUBTITLE.words[1]) + 1);
    for (const chunk of chunks) expect(wordsOf(chunk.text).length, `${text}: "${chunk.text}"`).toBeGreaterThanOrEqual(2);
  }
});

test("a phrase without words does not end on a binding word", () => {
  expect(endsBound("")).toBe(false);
  expect(endsBound("   ")).toBe(false);
});
