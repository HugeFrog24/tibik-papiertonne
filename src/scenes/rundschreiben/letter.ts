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
  { text: "Wir sind stets bemüht, die Umwelt zu schonen. Deshalb bitten wir Sie:", role: "body" },
  { text: "Das Entnehmen aus der Papiertonne ist nicht gestattet.", role: "body" },
  { text: "Bitte wenden Sie sich an den örtlichen Baumarkt, um einen Karton", role: "body" },
  { text: "käuflich zu erwerben.", role: "body" },
  {
    text: "Vie-len DANK. Vie-len DANK. Vie-len DANK. Vie-len DANK.",
    role: "thanks",
  },
  { text: "Mit freundlichen Grüßen", role: "signature" },
  { text: `Ihre ${HAUSVERWALTUNG}`, role: "signature" },
];

export const LETTER_READING = { charactersPerSecond: 17 };

export const mustReadSeconds = (roles: readonly LetterRole[]) =>
  LETTER_LINES.filter((l) => roles.includes(l.role)).reduce((n, l) => n + l.text.length, 0) /
  LETTER_READING.charactersPerSecond;

export const ENVELOPE_TEXT = {
  sender: HAUSVERWALTUNG,
  to: "An alle Mieterinnen und Mieter",
};
