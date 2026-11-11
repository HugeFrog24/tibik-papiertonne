import type { Line } from "../dialogue/line";
import { DIALLED } from "./klingelsturm/calls";
import { takeId } from "../dialogue/takeIds";
import { ENGLISH_DRAFT } from "./englishDraft";
import { SPOKEN } from "./spokenLines";

export type Voice = "tibik" | "tibik-inner" | "karen" | "anrufbeantworter" | "leitstelle";

export const RECORDING_SCRIPT_FILE = "docs/RECORDING_SCRIPT.md";

const VOICES: readonly { readonly voice: Voice; readonly title: string; readonly who: string; readonly direction: string }[] = [
  { voice: "tibik", title: "Tibik", who: "you", direction: "calm, polite, unbothered" },
  {
    voice: "tibik-inner",
    title: "Tibik's inner voice: the letter",
    who: "you",
    direction: "reading the letter to himself: deadpan, unhurried, close to the mic; every gendered form read straight. A soft echo is added in post",
  },
  { voice: "karen", title: "Karen", who: "you, last", direction: "indignant" },
  {
    voice: "anrufbeantworter",
    title: "The HWS answering machine",
    who: "ElevenLabs",
    direction: "a recorded office announcement: friendly-neutral, a little bored",
  },
  {
    voice: "leitstelle",
    title: "The police dispatcher (110)",
    who: "ElevenLabs",
    direction: "calm, professional, matter-of-fact",
  },
];

const ALSO: Readonly<Partial<Record<string, { readonly direction: string; readonly takes: readonly string[] }>>> = {
  "Tibik: Hä?": { direction: "baffled, short, the moment he looks up from the letter", takes: ["Äääh…"] },
};

export const voiceOf = (line: Line): Voice =>
  line.speaker === "narrator"
    ? "tibik-inner"
    : line.speaker === "phone"
      ? line.from < DIALLED[0].at
        ? "anrufbeantworter"
        : "leitstelle"
      : line.speaker;

const directionOf = (line: Line, voice: Voice) => {
  const also = ALSO[line.name];
  return [
    ...(line.far ? ["from far down the street, off screen: record it at full voice, the distance is added in post"] : []),
    ...(line.text.startsWith("…") ? ["after a beat"] : []),
    ...(line.tone === "shout" ? ["shouted, furious"] : []),
    also?.direction ?? VOICES.find((v) => v.voice === voice)!.direction,
    ...(also ? [`also record ${also.takes.map((take) => `„${take}“`).join(", ")}; one is picked in post and the subtitle follows it`] : []),
  ].join("; ");
};

const IDS: ReadonlyMap<Line, string> = new Map(
  SPOKEN.flatMap(({ key, lines }) =>
    [...lines].sort((a, b) => a.from - b.from).map((line, i) => [line, takeId(key, i, voiceOf(line))] as const),
  ),
);

export const takeIdOf = (line: Line) => line.take ?? IDS.get(line);

export type Take = {
  readonly id: string;
  readonly scene: string;
  readonly voice: Voice;
  readonly text: string;
  readonly english: string;
  readonly direction: string;
  readonly cue: string;
  readonly slot: number;
};

export const recordingTakes = (): Take[] =>
  SPOKEN.flatMap(({ title, lines }) => {
    const ordered = [...lines].sort((a, b) => a.from - b.from);
    return ordered.map((line, i) => {
      const voice = voiceOf(line);
      return {
        id: takeIdOf(line)!,
        scene: title,
        voice,
        text: line.text,
        english: [line.text, ...(ALSO[line.name]?.takes ?? [])].map((german) => ENGLISH_DRAFT[german]).join(" / "),
        direction: directionOf(line, voice),
        cue: i === 0 ? "" : ordered[i - 1].text,
        slot: Math.round((line.to - line.from) * 10) / 10,
      };
    });
  });

const HEADER = `# Recording script

Generated from the film's own dialogue, so it always matches the subtitles word for word.
After changing any line, regenerate it with \`UPDATE_RECORDING_SCRIPT=1 node scripts/test.mjs src/scenes/recordingScript.test.ts\`;
the test fails while this file and the film disagree.

## How to record

- **Who:** you record Tibik (including the letter, as his inner voice) and Karen; ElevenLabs makes the answering machine and the dispatcher.
- **Order:** batch by voice, in story order within each voice. Tibik first, Karen's shouting last. Before each take, read the cue (the line before it) to yourself so you are answering something.
- **One file per line**, named \`<ID>_t<take>.wav\`, e.g. \`klingelsturm_05_karen_t2.wav\`. Record two or three takes of each and keep them all; the ID stays the same if a line is reworded.
- **Format:** WAV, 48 kHz, 24-bit or 32-bit float, mono, no processing at all (no EQ, compression, noise removal or normalising; the mic's noise cancelling off). Peaks around -12 to -6 dB; lean back from the mic for Karen's shouts (32-bit float cannot clip in the file, but the capsule itself can still overload). Leave 0.5-1 s of silence before and after each line, and record 30-60 s of room silence once per session.
- **Pace:** your natural pace. The slot column is the line's current subtitle time, for orientation only; the scenes are retimed to your takes.
- **ElevenLabs:** export clean at the best quality on offer; the telephone sound is added in the mix so both phone voices match.
- **Where:** raw takes go in \`assets/recordings/private/\`, which is never committed. Finished takes (cut, cleaned, limited, no effects) go in \`public/dialogue/de/\` and \`public/dialogue/en/\`, one file per ID; after adding or replacing one, run \`node scripts/measure-takes.mjs\` so the film places it by its speech.
- **English (draft):** a US-English version of each line for the English edition (the police number stays 110, as the film is set in Germany); an alternative take follows a slash.
`;

const table = (takes: readonly Take[]) =>
  [
    "| File | Line | English (draft) | Direction | Cue (the line before) | Slot |",
    "| --- | --- | --- | --- | --- | --- |",
    ...takes.map((t) => `| \`${t.id}\` | ${t.text} | ${t.english} | ${t.direction} | ${t.cue || "—"} | ${t.slot.toFixed(1)} s |`),
  ].join("\n");

export const recordingScript = () => {
  const takes = recordingTakes();
  const sections = VOICES.map(({ voice, title, who }) => {
    const mine = takes.filter((t) => t.voice === voice);
    const scenes = [...new Set(mine.map((t) => t.scene))];
    return [`## ${title} (${who}): ${mine.length} lines`, ...scenes.map((scene) => `### ${scene}\n\n${table(mine.filter((t) => t.scene === scene))}`)].join("\n\n");
  });
  return `${HEADER}\n${sections.join("\n\n")}\n`;
};
