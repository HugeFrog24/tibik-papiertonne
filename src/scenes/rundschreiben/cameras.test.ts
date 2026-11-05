import { expect, test } from "vitest";
import { onScreen, seenBy } from "../../dialogue/screen";
import { LETTER_LAYOUT, PT, letterLineWidth, pointOnLetter } from "../../props/letterShape";
import { FPS } from "../../timeline";
import { CAPTION, SHOTS, cameraAt } from "./cameras";
import { RUNDSCHREIBEN_DURATION } from "./choreography";
import { solveRundschreiben } from "./solve";

const NAMES = [
  "Wide: Zwei Wochen später",
  "Mailbox",
  "Opening",
  "Insert: the letter",
  "Insert: Vie-len DANK",
  "Tibik",
  "Coda",
];
const READ_RATE = 17;
const shot = (name: string) => SHOTS.find((s) => s.name === name)!;
const mustRead = {
  "Insert: the letter": LETTER_LAYOUT.lines.filter((l) => l.role === "body"),
  "Insert: Vie-len DANK": LETTER_LAYOUT.lines.filter(
    (l) => l.role === "thanks" || l.role === "signature",
  ),
};

test("the shots run end to end over the scene, in the spec's order", () => {
  expect(SHOTS.map((s) => s.name)).toEqual(NAMES);
  expect(SHOTS[0].from).toBe(0);
  expect(SHOTS[SHOTS.length - 1].to).toBe(RUNDSCHREIBEN_DURATION);
  for (let i = 1; i < SHOTS.length; i++) expect(SHOTS[i].from).toBe(SHOTS[i - 1].to);
});

const onTheSheet = (t: number, x: number, fromTop: number) =>
  pointOnLetter(solveRundschreiben(t).letter!, x, fromTop);

test("every body line is at least 40 px tall in insert 1, the thanks line and signature in insert 2", () => {
  const problems: string[] = [];
  for (const [name, lines] of Object.entries(mustRead)) {
    const { from, to } = shot(name);
    for (let f = Math.round(from * FPS); f < Math.round(to * FPS); f += 5) {
      const t = f / FPS;
      const setup = cameraAt(t);
      for (const line of lines) {
        const size = line.pt * PT;
        const ends = [line.x, line.x + letterLineWidth(line)];
        for (const x of ends) {
          const top = onTheSheet(t, x, line.y);
          const bottom = onTheSheet(t, x, line.y + size);
          if (!seenBy(top, setup) || !seenBy(bottom, setup))
            problems.push(`${name} ${t.toFixed(2)} s: "${line.text}" leaves the frame`);
          const tall = Math.abs(onScreen(bottom, setup)[1] - onScreen(top, setup)[1]);
          if (tall < 40) problems.push(`${name} ${t.toFixed(2)} s: "${line.text}" ${tall.toFixed(1)} px`);
        }
      }
    }
  }
  expect(problems.slice(0, 8)).toEqual([]);
});

test("each insert is on screen long enough to read: characters / 17 seconds", () => {
  for (const [name, lines] of Object.entries(mustRead)) {
    const { from, to } = shot(name);
    const characters = lines.reduce((n, l) => n + l.text.length, 0);
    expect(to - from, name).toBeGreaterThanOrEqual(characters / READ_RATE);
  }
});

test("the time-jump caption is up for the first three seconds", () => {
  expect(CAPTION).toEqual({ text: "Zwei Wochen später.", from: 0, to: 3 });
});
