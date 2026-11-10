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
  readonly paragraph?: true;
}[] = [
  { text: HAUSVERWALTUNG, role: "head" },
  { text: "14.07.2026", role: "date" },
  { text: "An alle Mieterinnen und Mieter (m/w/d), Haus Nr. 12", role: "address" },
  { text: "Betreff: Hausordnung", role: "subject" },
  { text: "Sehr geehrte Daminnen, sehr geehrte Herrinnen, sehr geehrter Tibik,", role: "salutation" },
  { text: "wir sind stets bemüht, die Umwelt (m/w/d) zu schonen.", role: "body" },
  { text: "Sollten Sie einen Karton benötigen, ist dieser ausschließlich als", role: "body", paragraph: true },
  { text: "Neuware käuflich zu erwerben. Der örtliche Baumarkt berät Sie gerne", role: "body" },
  { text: "hinsichtlich der verfügbaren Größen und Bauformen.", role: "body" },
  { text: "Die Entnahme von Kartons aus der Papiertonne (w/m/d) ist aus", role: "body", paragraph: true },
  { text: "Umweltgründen nicht gestattet.", role: "body" },
  {
    text: "Vie-len DANK. Vie-len DANK. Vie-len DANK. Vie-len DANK.",
    role: "thanks",
  },
  { text: "Mit freundlichen Grüßinnen und Grüßen", role: "signature" },
  { text: `Ihre ${HAUSVERWALTUNG}`, role: "signature" },
];

export const LETTER_FOOTER: readonly (readonly string[])[] = [
  [HAUSVERWALTUNG, "Lindenstraße 14"],
  ["Tel. 0123 456789", "Sprechzeiten:", "Di und Do 9–12 Uhr"],
  ["Bankverbindung:", "Sparkasse", "IBAN DE12 3456 7890 1234 5678 90"],
];

export const LETTER_READING = { charactersPerSecond: 17 };

export const mustReadSeconds = (roles: readonly LetterRole[]) =>
  LETTER_LINES.filter((l) => roles.includes(l.role)).reduce((n, l) => n + l.text.length, 0) /
  LETTER_READING.charactersPerSecond;

export const ENVELOPE_TEXT = {
  sender: HAUSVERWALTUNG,
  to: "An alle Mieterinnen und Mieter",
};

const SALUTATION = LETTER_LINES.findIndex((l) => l.role === "salutation");
const THANKS = LETTER_LINES.findIndex((l) => l.role === "thanks");
const CLOSING = LETTER_LINES.findIndex((l) => l.role === "signature");

export const READ_OUT: readonly [number, number] = [SALUTATION, THANKS];
export const SHOWN_IN_THE_INSERT: readonly [number, number] = [SALUTATION, CLOSING + 1];
