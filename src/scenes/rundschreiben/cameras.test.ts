import { Vector3 } from "three";
import { expect, test } from "vitest";
import { allColliders } from "../../characters/skeleton";
import { FRAME_SIZE, mouthInWorld } from "../../dialogue/screen";
import { A4, DL } from "../../props/letterShape";
import { asCharacter } from "../../Tibik/character";
import { RIG } from "../../Tibik/rig";
import { onScreen, seenBy } from "../../dialogue/screen";
import { LETTER_LAYOUT, PT, letterLineWidth, pointOnLetter } from "../../props/letterShape";
import { FPS } from "../../timeline";
import { CAPTION, FOLDING_SHOT, SHOTS, cameraAt } from "./cameras";
import { FLAP, FOLD, RUNDSCHREIBEN_DURATION, UNFOLD } from "./choreography";
import { solveRundschreiben } from "./solve";

const NAMES = [
  "Wide: Zwei Wochen später",
  "Mailbox",
  "Opening",
  "Insert: the letter",
  "Insert: Vie-len DANK",
  "Tibik",
  "His hands: folding it back",
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

type Working = { readonly envelope?: readonly [number, number]; readonly letter?: readonly [number, number] };

const paperOutOfView = (from: number, to: number, working: Working) => {
  const hidden: string[] = [];
  for (let f = Math.ceil(from * FPS); f < Math.round(to * FPS); f += 3) {
    const t = f / FPS;
    const state = solveRundschreiben(t);
    const setup = cameraAt(t);
    const lens = new Vector3(...setup.position);
    const body = allColliders(RIG, asCharacter(state.tibik));
    const held = [
      ...(state.envelope && working.envelope ? [{ name: "envelope", at: new Vector3(DL[0] / 2, DL[1] / 2, 0).applyMatrix4(state.envelope.matrix), matrix: state.envelope.matrix, window: working.envelope }] : []),
      ...(state.letter && working.letter ? [{ name: "letter", at: pointOnLetter(state.letter, A4[0] / 2, A4[1] / 2), matrix: state.letter.matrix, window: working.letter }] : []),
    ];
    for (const { name, at, matrix, window: [start, end] } of held) {
      const normal = new Vector3(0, 0, 1).transformDirection(matrix);
      const facing = Math.abs(normal.dot(lens.clone().sub(at).normalize()));
      if (t >= start && t <= end && facing < 0.45) hidden.push(`${t.toFixed(2)} s: ${name} seen edge-on (${facing.toFixed(2)})`);
      const [x, y] = onScreen(at, setup);
      if (x < 0 || x > FRAME_SIZE.width || y < 0 || y > FRAME_SIZE.height) hidden.push(`${t.toFixed(2)} s: ${name} out of frame`);
      const ray = at.clone().sub(lens);
      const length = ray.length();
      ray.normalize();
      const blocker = body.filter((s) => !/hand|arm/.test(s.name)).find((s) => {
        const along = s.center.clone().sub(lens).dot(ray);
        return along > 0 && along < length - 0.05 && s.center.distanceTo(lens.clone().addScaledVector(ray, along)) < s.radius;
      });
      if (blocker) hidden.push(`${t.toFixed(2)} s: ${name} behind ${blocker.name}`);
    }
  }
  return hidden;
};

test("the opening shot shows his hands at work: the envelope and the unfolding letter are in frame, turned towards the lens while he opens and unfolds them, never behind his head or body", { timeout: 300_000 }, () => {
  const { from, to } = shot("Opening");
  expect(paperOutOfView(from, to, { envelope: FLAP, letter: UNFOLD }).slice(0, 6)).toEqual([]);
});

test("after the deadpan close-up he is seen finishing the fold and sliding the letter into the envelope", { timeout: 300_000 }, () => {
  expect(paperOutOfView(FOLDING_SHOT, FOLD[1] - 0.2, { letter: [FOLDING_SHOT, FOLD[1]] }).slice(0, 6)).toEqual([]);
  const { from, to } = shot("Tibik");
  for (let f = Math.ceil(from * FPS); f < Math.round(to * FPS); f += 3) {
    const t = f / FPS;
    const [x, y] = onScreen(mouthInWorld(RIG, solveRundschreiben(t).tibik), cameraAt(t));
    expect(x > 0 && x < FRAME_SIZE.width && y > 0 && y < FRAME_SIZE.height, `${t.toFixed(2)} s: his face`).toBe(true);
  }
});
