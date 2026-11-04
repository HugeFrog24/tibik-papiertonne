import { HAUSVERWALTUNG } from "../../street/building";

export type LetterRole =
  | "head"
  | "date"
  | "address"
  | "subject"
  | "body"
  | "thanks"
  | "signature";

export const LETTER_LINES: readonly {
  readonly text: string;
  readonly role: LetterRole;
}[] = [
  { text: HAUSVERWALTUNG, role: "head" },
  { text: "Musterstadt, 14.07.2026", role: "date" },
  { text: "An alle Mieterinnen und Mieter, Haus Nr. 12", role: "address" },
  { text: "Betreff: Hausordnung", role: "subject" },
  { text: "Sehr geehrte Mieterinnen und Mieter,", role: "body" },
  { text: "aus gegebenem Anlass:", role: "body" },
  {
    text: "In die Papiertonne gehört nur Papier. Entnehmen ist nicht gestattet.",
    role: "body",
  },
  { text: "Streit gehört nicht ins Treppenhaus.", role: "body" },
  {
    text: "Vie-len DANK. Vie-len DANK. Vie-len DANK. Vie-len DANK.",
    role: "thanks",
  },
  { text: "Mit freundlichen Grüßen", role: "signature" },
  { text: `Ihre ${HAUSVERWALTUNG}`, role: "signature" },
];

export const ENVELOPE_TEXT = {
  sender: HAUSVERWALTUNG,
  to: "An alle Mieterinnen und Mieter",
};
