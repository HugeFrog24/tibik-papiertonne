import { FORMATS, type Format } from "../frameRate";
import { textWidth, typeOf, wordsOf } from "./text";
import type { Line, Speaker, Tone } from "./line";
import type { Language } from "../language";

export const SUBTITLE = { words: [3, 5], minSeconds: 1, maxCps: 20, targetCps: 17, maxLines: 2, clauseBreakSlack: 1.15, typeSlack: 0.95 } as const;

export const SUBTITLE_WORDS: Readonly<Record<Language, readonly [number, number]>> = { de: SUBTITLE.words, en: [3, 7] };

export const SUBTITLE_SPLIT_SECONDS: Readonly<Record<Language, number>> = { de: SUBTITLE.minSeconds, en: 1.5 };

type Bar = {
  readonly centerX: number;
  readonly bottom: number;
  readonly maxWidth: number;
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly padding: number;
};

const bar = (centerX: number, bottom: number, maxWidth: number, fontSize: number): Bar => ({
  centerX,
  bottom,
  maxWidth,
  fontSize,
  lineHeight: Math.round(fontSize * 1.25),
  padding: Math.round(fontSize * 0.45),
});

export const SUBTITLE_BAR: Readonly<Record<Format, Bar>> = {
  wide: bar(960, 1010, 1560, 64),
  tall: bar(540, 1400, 800, 66),
};

const TIBIK_GREEN = "#e8f3e1";

export const SPEAKER_INK: Readonly<Record<Speaker, { readonly color: string; readonly italic: boolean }>> = {
  tibik: { color: TIBIK_GREEN, italic: false },
  karen: { color: "#f1e8f6", italic: false },
  phone: { color: "#ffffff", italic: true },
  narrator: { color: TIBIK_GREEN, italic: true },
};

export type Chunk = {
  readonly text: string;
  readonly lines: readonly string[];
  readonly from: number;
  readonly to: number;
  readonly speaker: Speaker;
  readonly tone: Tone;
  readonly line: string;
};

export const CLAUSE_END = /[,.?!…—:;]$/;

export const BINDS_TO_THE_NEXT: ReadonlySet<string> = new Set([
  ...["der", "die", "das", "den", "dem", "des", "ein", "eine", "einen", "einem", "einer", "eines"],
  ...["kein", "keine", "keinen", "keinem", "keiner", "keines"],
  ...["an", "am", "auf", "aus", "bei", "mit", "nach", "von", "vom", "zu", "zum", "zur", "in", "im", "ins", "für", "über", "unter", "vor", "hinter", "neben", "zwischen", "durch", "gegen", "ohne", "um", "hinsichtlich", "bezüglich", "wegen", "trotz", "während", "seit", "bis", "ab"],
  ...["außerhalb", "innerhalb", "statt", "gegenüber", "außer", "beim", "ans", "aufs", "fürs", "ums", "übers", "durchs", "hinterm", "unterm", "vorm"],
  ...["und", "oder", "aber", "denn", "dass", "weil", "ob", "wenn", "als", "sehr", "sondern", "bevor", "nachdem", "damit", "obwohl", "sobald", "falls", "sowie"],
  ...["mein", "meine", "meinen", "meinem", "meiner", "seine", "seinen", "seinem", "ihre", "ihren", "ihrem", "unser", "unsere", "unserer", "unserem", "unseren", "euer", "eure", "euren", "eurem", "eurer"],
]);

const compositions = (total: number, parts: number, low: number, high: number): number[][] => {
  if (parts === 1) return total >= low && total <= high ? [[total]] : [];
  const out: number[][] = [];
  for (let first = low; first <= Math.min(high, total - low * (parts - 1)); first++) {
    for (const rest of compositions(total - first, parts - 1, low, high)) out.push([first, ...rest]);
  }
  return out;
};

export const ENGLISH_BINDS_TO_THE_NEXT: ReadonlySet<string> = new Set([
  ...["a", "an", "the", "this", "these", "those", "my", "your", "his", "her", "our", "their", "its", "every", "each", "no"],
  ...["to", "of", "for", "in", "on", "at", "by", "with", "from", "into", "onto", "about", "as", "than", "out"],
  ...["and", "or", "but", "if", "that", "because", "when", "while", "very", "not", "dear", "mrs.", "mr.", "ms."],
  ...["will", "would", "can", "could", "shall", "must", "may", "might", "be"],
]);

const BINDS: Readonly<Record<Language, ReadonlySet<string>>> = { de: BINDS_TO_THE_NEXT, en: ENGLISH_BINDS_TO_THE_NEXT };

export const bindsToTheNext = (word: string, language: Language = "de") => BINDS[language].has(word.toLowerCase());

export const endsBound = (text: string, language: Language = "de") => {
  const words = wordsOf(text);
  return words.length > 0 && bindsToTheNext(words[words.length - 1], language);
};

const SHORTEST_CLEAN_PHRASE = 2;

type Band = readonly [number, number];

const groupSizes = (
  words: readonly string[],
  parts: number,
  accept: (sizes: readonly number[]) => boolean,
  [fewest, most]: Band = SUBTITLE.words,
  fallBack = true,
  language: Language = "de",
): number[] | undefined => {
  const bounded = compositions(words.length, parts, fewest, most);
  const all = bounded.length > 0 || !fallBack ? bounded : compositions(words.length, parts, 1, words.length);
  if (all.length === 0) return undefined;
  const acceptable = all.filter(accept);
  const candidates = acceptable.length > 0 ? acceptable : all;
  const score = (sizes: readonly number[]) => {
    let at = 0;
    let atClauses = 0;
    let dangling = 0;
    for (const size of sizes.slice(0, -1)) {
      at += size;
      if (CLAUSE_END.test(words[at - 1])) atClauses++;
      if (bindsToTheNext(words[at - 1], language)) dangling++;
    }
    return { atClauses, dangling, spread: Math.max(...sizes) - Math.min(...sizes) };
  };
  return candidates.reduce((best, sizes) => {
    const [a, b] = [score(sizes), score(best)];
    if (a.dangling !== b.dangling) return a.dangling < b.dangling ? sizes : best;
    if (a.atClauses !== b.atClauses) return a.atClauses > b.atClauses ? sizes : best;
    return a.spread < b.spread ? sizes : best;
  });
};

const wrap = (text: string, tone: Tone, format: Format): string[] => {
  const { font, spacing } = typeOf(tone);
  const { fontSize, maxWidth, padding } = SUBTITLE_BAR[format];
  const room = (maxWidth - 2 * padding) * SUBTITLE.typeSlack;
  const width = (line: string) => textWidth(line, font, fontSize, spacing);
  if (width(text) <= room) return [text];
  const words = wordsOf(text);
  const widest = (lines: readonly string[]) => Math.max(...lines.map(width));
  const fitting = words
    .slice(1)
    .map((_, i) => [words.slice(0, i + 1).join(" "), words.slice(i + 1).join(" ")])
    .filter((pair) => widest(pair) <= room);
  const mostEven = (pairs: readonly string[][]) =>
    pairs.reduce<string[] | null>((best, pair) => (best === null || widest(pair) < widest(best) ? pair : best), null);
  const evenest = mostEven(fitting);
  const even = evenest && (mostEven(fitting.filter((pair) => CLAUSE_END.test(pair[0]) && widest(pair) <= widest(evenest) * SUBTITLE.clauseBreakSlack)) ?? evenest);
  return (
    even ??
    words.reduce<string[]>((lines, word) => {
      const last = lines.at(-1);
      if (last !== undefined && width(`${last} ${word}`) <= room) return [...lines.slice(0, -1), `${last} ${word}`];
      return [...lines, word];
    }, [])
  );
};

export const wrapsInto = (text: string, tone: Tone, format: Format) => wrap(text, tone, format).length;

const cut = (line: Line, format: Format): Chunk[] => {
  const language = line.language ?? "de";
  const band = SUBTITLE_WORDS[language];
  const words = wordsOf(line.text);
  const duration = line.to - line.from;
  const total = words.join(" ").length;
  const longEnough = (texts: readonly string[]) => texts.every((t) => (duration * t.length) / total >= SUBTITLE.minSeconds - 1e-9);
  const fits = (texts: readonly string[]) => texts.every((t) => wrap(t, line.tone, format).length <= SUBTITLE.maxLines);
  const textsOf = (sizes: readonly number[]) =>
    sizes.reduce<{ at: number; texts: string[] }>(
      ({ at, texts }, size) => ({ at: at + size, texts: [...texts, words.slice(at, at + size).join(" ")] }),
      { at: 0, texts: [] },
    ).texts;
  const sizesIn = (parts: number, accept: (texts: readonly string[]) => boolean, bandOf?: Band, fallBack?: boolean) =>
    groupSizes(words, parts, (sizes) => accept(textsOf(sizes)), bandOf ?? band, fallBack, language);
  const textsIn = (parts: number, accept: (texts: readonly string[]) => boolean = () => true) => textsOf(sizesIn(parts, accept) ?? [words.length]);
  const most = Math.min(words.length, Math.ceil(words.length / band[1]));
  const counts = [...Array.from({ length: most }, (_, i) => most - i), ...Array.from({ length: words.length - most }, (_, i) => most + 1 + i)];
  const clauses = words
    .reduce<string[][]>((out, word) => {
      const last = out.at(-1);
      return last === undefined || CLAUSE_END.test(last[last.length - 1]) ? [...out, [word]] : [...out.slice(0, -1), [...last, word]];
    }, [])
    .map((clause) => clause.join(" "));
  const phrases = (texts: readonly string[]) => texts.every((t) => wordsOf(t).length >= band[0] && wordsOf(t).length <= band[1]);
  const acceptable = (texts: readonly string[]) => longEnough(texts) && fits(texts);
  const dangles = (texts: readonly string[]) => texts.slice(0, -1).some((t) => endsBound(t, language));
  const clean = (texts: readonly string[]) => acceptable(texts) && !dangles(texts);
  const cleanSplit = (count: number) =>
    [sizesIn(count + 1, clean, band, false), sizesIn(count, clean, [SHORTEST_CLEAN_PHRASE, band[1]], false)]
      .map((sizes) => (sizes ? textsOf(sizes) : undefined))
      .find((texts) => texts !== undefined && clean(texts));
  let firstLongEnough: string[] | undefined;
  let texts: string[] | undefined = clauses.length > 1 && phrases(clauses) && longEnough(clauses) && fits(clauses) ? clauses : undefined;
  for (const count of texts ? [] : counts) {
    const candidate = textsIn(count, longEnough);
    if (!longEnough(candidate)) continue;
    firstLongEnough ??= candidate;
    const fitting = textsIn(count, acceptable);
    if (acceptable(fitting)) {
      texts = dangles(fitting) && count >= most ? (cleanSplit(count) ?? fitting) : fitting;
      break;
    }
  }
  texts ??= firstLongEnough ?? textsIn(1);
  const shareOf = (chunks: readonly string[]) => chunks.map((t) => (duration * t.length) / chunks.join(" ").length);
  if (texts.length > 1 && fits([line.text]) && Math.min(...shareOf(texts)) < SUBTITLE_SPLIT_SECONDS[language] - 1e-9) texts = [line.text];
  const durations = shareOf(texts);
  let from = line.from;
  return texts.map((text, i) => {
    const to = i === texts.length - 1 ? line.to : from + durations[i];
    const chunk = { text, lines: wrap(text, line.tone, format), from, to, speaker: line.speaker, tone: line.tone, line: line.name };
    from = to;
    return chunk;
  });
};

const cuts = new WeakMap<Line, Map<Format, Chunk[]>>();

export const chunksOf = (line: Line, format: Format): Chunk[] => {
  const byFormat = cuts.get(line) ?? new Map<Format, Chunk[]>();
  cuts.set(line, byFormat);
  const known = byFormat.get(format) ?? cut(line, format);
  byFormat.set(format, known);
  return known;
};

export const chunkAt = (lines: readonly Line[], t: number, format: Format): Chunk | null => {
  const line = lines.find((l) => t >= l.from && t < l.to);
  return line ? chunksOf(line, format).find((c) => t >= c.from && t < c.to) ?? null : null;
};

export const aboveTheBar = (format: Format) => {
  const { bottom, lineHeight, padding } = SUBTITLE_BAR[format];
  return (bottom - SUBTITLE.maxLines * lineHeight - 2 * padding) / FORMATS[format].height;
};

export const barRect = (chunk: Chunk, format: Format) => {
  const { centerX, bottom, fontSize, lineHeight, padding } = SUBTITLE_BAR[format];
  const { font, spacing } = typeOf(chunk.tone);
  const width = Math.max(...chunk.lines.map((l) => textWidth(l, font, fontSize, spacing))) / SUBTITLE.typeSlack + 2 * padding;
  const height = chunk.lines.length * lineHeight + 2 * padding;
  return { left: centerX - width / 2, top: bottom - height, width, height };
};
