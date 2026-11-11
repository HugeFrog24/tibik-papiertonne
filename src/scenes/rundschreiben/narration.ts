import type { Line } from "../../dialogue/line";
import { takeId } from "../../dialogue/takeIds";
import TAKES from "../../dialogue/takes.json";
import { LINES, READ } from "./choreography";
import { LETTER_LINES, READ_OUT } from "./letter";

const SENTENCE_END = /[.:!?]$/;
const RUNS_ON = new Set(["salutation", "body"]);

type Sentence = { readonly text: string; readonly role: string; readonly paragraph?: true };

const SENTENCE_BREAK = /(?<=[.:!?])\s+/;

const runsOf = (lines: readonly Sentence[]) =>
  lines.reduce<Sentence[]>((out, line) => {
    const last = out.at(-1);
    const joins = last !== undefined && !line.paragraph && last.role === line.role && RUNS_ON.has(line.role) && !SENTENCE_END.test(last.text);
    return joins ? [...out.slice(0, -1), { ...last, text: `${last.text} ${line.text}` }] : [...out, { text: line.text, role: line.role }];
  }, []);

export const sentencesOf = (lines: readonly Sentence[]) =>
  runsOf(lines).flatMap(({ text, role }) => text.split(SENTENCE_BREAK).map((sentence) => ({ text: sentence, role })));

const spokenFor = (index: number) => {
  const take = (TAKES.de as Readonly<Partial<Record<string, { readonly speech: readonly (readonly number[])[] }>>>)[takeId("rundschreiben", index, "tibik-inner")];
  return take?.speech.length === 1 ? take.speech[0][1] - take.speech[0][0] : undefined;
};

const lengthsOf = (sentences: readonly Sentence[], span: number) => {
  const spoken = sentences.map((_, i) => spokenFor(i));
  if (spoken.every((s): s is number => s !== undefined)) {
    const pause = (span - spoken.reduce((a, b) => a + b, 0)) / sentences.length;
    return spoken.map((s) => s + pause);
  }
  const total = sentences.reduce((n, s) => n + s.text.length, 0);
  return sentences.map(({ text }) => (span * text.length) / total);
};

const timed = (sentences: readonly Sentence[], [from, to]: readonly [number, number]): Line[] => {
  const lengths = lengthsOf(sentences, to - from);
  let at = from;
  return sentences.map(({ text }, i) => {
    const start = at;
    const end = i === sentences.length - 1 ? to : start + lengths[i];
    at = end;
    return { speaker: "narrator", tone: "calm", text, from: start, to: end, name: `Letter: ${text}` };
  });
};

export const LETTER_READ: readonly Line[] = timed(sentencesOf(LETTER_LINES.slice(...READ_OUT)), READ);

export const RUNDSCHREIBEN_SPOKEN: readonly Line[] = [...LETTER_READ, ...LINES];
