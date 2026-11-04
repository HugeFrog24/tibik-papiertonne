import type { Line } from "./line";

export const outOfOrder = (lines: readonly Line[]) =>
  lines.flatMap((line, i) => {
    const problems: string[] = [];
    if (line.to <= line.from)
      problems.push(`${line.name} ends before it starts`);
    const next = lines[i + 1];
    if (next && next.from < line.to)
      problems.push(`${next.name} starts before ${line.name} ends`);
    return problems;
  });

const capitals = (text: string) =>
  text.replace(/ß/g, "SS") === text.toUpperCase();

export const karenNotShouting = (lines: readonly Line[]) =>
  lines
    .filter(
      (line) =>
        line.speaker === "karen" &&
        (!capitals(line.text) || line.tone !== "shout"),
    )
    .map((line) => `${line.name} is not shouted in capitals`);

const DU = /(?<!\p{L})(du|dich|dir|dein\p{L}*)(?!\p{L})/iu;

export const duzen = (lines: readonly Line[]) =>
  lines
    .filter((line) => DU.test(line.text))
    .map((line) => `${line.name} says du`);

const PHRASE_END = /[.!?…]["“”»]?\s\S/u;

export const morePhrasesThanOne = (lines: readonly Line[]) =>
  lines
    .filter((line) => PHRASE_END.test(line.text))
    .map((line) => `${line.name} holds more than one phrase`);

export const READING = { charactersPerSecond: 20, minimum: 5 / 6 };

export const readingTime = (text: string) =>
  Math.max(READING.minimum, text.length / READING.charactersPerSecond);

export const tooFastToRead = (lines: readonly Line[]) =>
  lines
    .filter((line) => line.to - line.from + 1e-9 < readingTime(line.text))
    .map(
      (line) =>
        `${line.name} is up ${(line.to - line.from).toFixed(2)} s, needs ${readingTime(line.text).toFixed(2)} s`,
    );
