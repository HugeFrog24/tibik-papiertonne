import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { expect, test } from "vitest";
import { LETTER_READ } from "./rundschreiben/narration";
import { ALL_SPOKEN_LINES } from "./spokenLines";
import { ENGLISH_DRAFT } from "./englishDraft";
import { RECORDING_SCRIPT_FILE, recordingScript, recordingTakes } from "./recordingScript";

test("every line the film speaks is in the recording script once, word for word, under the voice that records it, each with its own file ID", () => {
  const takes = recordingTakes();
  expect(takes.map((t) => t.text).sort()).toEqual(ALL_SPOKEN_LINES.map((l) => l.text).sort());
  expect(new Set(takes.map((t) => t.id)).size).toBe(takes.length);
  expect(takes.filter((t) => t.voice === "tibik-inner").map((t) => t.text)).toEqual(LETTER_READ.map((l) => l.text));
  expect(takes.filter((t) => t.voice === "anrufbeantworter").map((t) => t.text)).toEqual([
    "HWS Hausverwaltung.",
    "Sie rufen außerhalb unserer Sprechzeiten an.",
    "Bitte hinterlassen Sie eine Nachricht nach dem Signalton.",
  ]);
  const reaction = takes.find((t) => t.text === "Hä?");
  expect(reaction?.voice).toBe("tibik");
  expect(reaction?.direction).toContain("also record „Äääh…“");
  expect(takes.filter((t) => t.voice === "leitstelle").map((t) => t.text)).toEqual(["Ist jemand verletzt oder in Gefahr?", "Ein Karton ist kein Notfall."]);
});

test("the recording script in docs is the one the film's lines make: regenerate it with UPDATE_RECORDING_SCRIPT=1 after changing a line", () => {
  if (process.env["UPDATE_RECORDING_SCRIPT"]) writeFileSync(RECORDING_SCRIPT_FILE, recordingScript());
  expect(existsSync(RECORDING_SCRIPT_FILE)).toBe(true);
  expect(readFileSync(RECORDING_SCRIPT_FILE, "utf8").replace(/\r\n/g, "\n")).toBe(recordingScript());
});

test("every line and alternative take has an English draft beside it for the English edition, Karen's still in capitals, and no draft is left over from a line the film no longer speaks", () => {
  const takes = recordingTakes();
  for (const take of takes) {
    expect(take.english, take.id).toMatch(/\S/);
    if (take.voice === "karen") expect(take.english, take.id).toBe(take.english.toUpperCase());
  }
  expect(takes.find((t) => t.text === "Hä?")?.english).toBe("Huh? / Uhhh…");
  expect(takes.find((t) => t.id === "klingelsturm_01_tibik")?.english, "the owner's English retake behind his door (2026-11-11)").toBe("Yeah, what's up?");
  expect(takes.find((t) => t.id === "klingelsturm_07_tibik")?.english, "his English take opens with a long no (owner, 2026-11-11)").toBe("Nooo. Not for the environment's sake.");
  const spoken = new Set([...takes.map((t) => t.text), "Äääh…"]);
  expect(Object.keys(ENGLISH_DRAFT).filter((german) => !spoken.has(german))).toEqual([]);
  expect(recordingScript()).toContain("| File | Line | English (draft) | Direction | Cue (the line before) | Slot |");
});

test("every line and every alternative take the script asks for has its own English draft, so none reads 'undefined'", () => {
  const takes = recordingTakes();
  const german = [...takes.map((t) => t.text), "Äääh…"];
  expect(german.filter((text) => !(text in ENGLISH_DRAFT))).toEqual([]);
  expect(takes.filter((t) => t.english.includes("undefined")).map((t) => t.id)).toEqual([]);
});
