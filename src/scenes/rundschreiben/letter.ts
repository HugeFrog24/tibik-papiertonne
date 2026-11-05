import { HAUSVERWALTUNG } from "../../street/building";

export type LetterRole =
  | "head"
  | "date"
  | "address"
  | "subject"
  | "salutation"
  | "body"
  | "thanks"
  | "signature";

export const LETTER_LINES: readonly {
  readonly text: string;
  readonly role: LetterRole;
}[] = [
  { text: HAUSVERWALTUNG, role: "head" },
  { text: "Musterstadt, 14.07.2026", role: "date" },
  { text: "An alle Mieterinnen und Mieter (m/w/d), Haus Nr. 12", role: "address" },
  { text: "Betreff: Hausordnung", role: "subject" },
  { text: "Sehr geehrte Daminnen und Damen, sehr geehrte Herrinnen und Herren,", role: "salutation" },
  { text: "sehr geehrter Tibik,", role: "salutation" },
  { text: "wir sind stets bemüht, die Umwelt (m/w/d) zu schonen.", role: "body" },
  { text: "Deshalb bitten wir Sie:", role: "body" },
  { text: "Das Entnehmen aus der Papiertonne (w/m/d) ist nicht gestattet.", role: "body" },
  { text: "Ressourcinnen und Ressourcen sind kostbar.", role: "body" },
  { text: "Bitte wenden Sie sich an den örtlichen", role: "body" },
  { text: "Baumarkt, um einen Karton käuflich zu erwerben.", role: "body" },
  {
    text: "Vie-len DANK. Vie-len DANK. Vie-len DANK. Vie-len DANK.",
    role: "thanks",
  },
  { text: "Mit freundlichen Grüßinnen und Grüßen", role: "signature" },
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
