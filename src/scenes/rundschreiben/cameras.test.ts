import { Vector3 } from "three";
import { ballInTheWay, sightLine } from "../../physics/rays";
import { FORMATS, atFrame } from "../../frameRate";
import { expect, test } from "vitest";
import { allColliders, handPosition } from "../../characters/skeleton";
import { readFileSync } from "node:fs";
import path from "node:path";
import { mouthInWorld } from "../../dialogue/screen";
import { A4, DL } from "../../props/letterShape";
import { asCharacter } from "../../Tibik/character";
import { RIG } from "../../Tibik/rig";
import { onScreen, seenBy } from "../../dialogue/screen";
import { LETTER_LAYOUT, PT, letterLineWidth, pointOnLetter } from "../../props/letterShape";
import { FPS } from "../../timeline";
import * as cameras from "./cameras";
import { FOLDING_SHOT, READABLE, SHOTS, cameraAt } from "./cameras";
import { barRect, chunkAt } from "../../dialogue/subtitles";
import { LETTER_READ } from "./narration";
import { READ_OUT, SHOWN_IN_THE_INSERT } from "./letter";
import { FLAP, FOLD, RUNDSCHREIBEN_DURATION, UNFOLD, envelopeAt } from "./choreography";
import { solveRundschreiben } from "./solve";
import { DOOR_SHUT } from "./home";

const NAMES = [
  "Wide: Zwei Wochen später",
  "Mailbox",
  "Opening",
  "Insert: the letter",
  "Tibik",
  "His hands: folding it back",
  "Coda",
];
const READ_RATE = 17;
const shot = (name: string) => SHOTS.find((s) => s.name === name)!;
const mustRead = { "Insert: the letter": LETTER_LAYOUT.lines.slice(...SHOWN_IN_THE_INSERT) };
const PAGE_CORNERS = [[0, 0], [A4[0], 0], [0, A4[1]], [A4[0], A4[1]]] as const;
const SURROUNDINGS = 0.8;

test("the shots run end to end over the scene, to its last whole frame, in the spec's order", () => {
  expect(SHOTS.map((s) => s.name)).toEqual(NAMES);
  expect(SHOTS[0].from).toBe(0);
  expect(SHOTS[SHOTS.length - 1].to).toBe(atFrame(RUNDSCHREIBEN_DURATION));
  for (let i = 1; i < SHOTS.length; i++) expect(SHOTS[i].from).toBe(SHOTS[i - 1].to);
});

const onTheSheet = (t: number, x: number, fromTop: number) =>
  pointOnLetter(solveRundschreiben(t).letter!, x, fromTop);

test("wide: the one letter insert opens on the letter from its salutation to its closing, every line in frame and at least READABLE px tall, then zooms out until the whole page and some of what is around it are in view", () => {
  const { from, to } = shot("Insert: the letter");
  const opening = cameraAt(from);
  const problems: string[] = [];
  for (const line of mustRead["Insert: the letter"])
    for (const x of [line.x, line.x + letterLineWidth(line)]) {
      const top = onTheSheet(from, x, line.y);
      const bottom = onTheSheet(from, x, line.y + line.pt * PT);
      if (!seenBy(top, opening) || !seenBy(bottom, opening)) problems.push(`"${line.text}" leaves the frame`);
      const tall = Math.abs(onScreen(bottom, opening)[1] - onScreen(top, opening)[1]);
      if (tall < READABLE) problems.push(`"${line.text}" ${tall.toFixed(1)} px`);
    }
  expect(problems).toEqual([]);
  const end = to - 1 / FPS;
  const corners = PAGE_CORNERS.map(([x, y]) => onScreen(onTheSheet(end, x, y), cameraAt(end)));
  for (const [x, y] of PAGE_CORNERS) expect(seenBy(onTheSheet(end, x, y), cameraAt(end))).toBe(true);
  const ys = corners.map(([, y]) => y);
  expect(Math.max(...ys) - Math.min(...ys)).toBeLessThanOrEqual(SURROUNDINGS * FORMATS.wide.height);
});

const insertSamples = () => {
  const { from, to } = shot("Insert: the letter");
  const times: number[] = [];
  for (let f = Math.round(from * FPS); f < Math.round(to * FPS); f += 5) times.push(f / FPS);
  return times;
};

test("tall: the one letter insert shows the whole page, centred, from start to end, and ends zoomed out with what is around it in view", () => {
  const { to } = shot("Insert: the letter");
  const problems: string[] = [];
  for (const t of insertSamples()) {
    const setup = cameraAt(t, "tall");
    for (const [x, y] of PAGE_CORNERS) if (!seenBy(onTheSheet(t, x, y), setup, 0, "tall")) problems.push(`${t.toFixed(2)} s: corner ${x}, ${y} out`);
    const [cx, cy] = onScreen(onTheSheet(t, A4[0] / 2, A4[1] / 2), setup, "tall");
    if (Math.abs(cx - FORMATS.tall.width / 2) > 0.05 * FORMATS.tall.width || Math.abs(cy - FORMATS.tall.height / 2) > 0.05 * FORMATS.tall.height) problems.push(`${t.toFixed(2)} s: page off centre at ${cx.toFixed(0)}, ${cy.toFixed(0)}`);
  }
  expect(problems.slice(0, 8)).toEqual([]);
  const end = to - 1 / FPS;
  const xs = PAGE_CORNERS.map(([x, y]) => onScreen(onTheSheet(end, x, y), cameraAt(end, "tall"), "tall")[0]);
  expect(Math.max(...xs) - Math.min(...xs)).toBeLessThanOrEqual(SURROUNDINGS * FORMATS.tall.width);
});

test("the letter insert is on screen long enough to read what the narration reads, the salutation to the closing ban: characters / 17 seconds", () => {
  const { from, to } = shot("Insert: the letter");
  const characters = LETTER_LAYOUT.lines.slice(...READ_OUT).reduce((n, l) => n + l.text.length, 0);
  expect(to - from).toBeGreaterThanOrEqual(characters / READ_RATE);
});

test("the epilogue's opening wide carries no caption: the time jump is captioned on the morning before it", () => {
  expect("CAPTION" in cameras).toBe(false);
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
      if (x < 0 || x > FORMATS.wide.width || y < 0 || y > FORMATS.wide.height) hidden.push(`${t.toFixed(2)} s: ${name} out of frame`);
      const sight = sightLine(lens, at);
      const blocker = body.filter((s) => !/hand|arm/.test(s.name)).find((s) => ballInTheWay(sight, s.center, s.radius, 0.05));
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
    expect(x > 0 && x < FORMATS.wide.width && y > 0 && y < FORMATS.wide.height, `${t.toFixed(2)} s: his face`).toBe(true);
  }
});

test("while the letter slides back into the envelope, the lens sees the envelope's front, so the letter behind it reads as inside", () => {
  for (let f = Math.ceil(FOLD[0] * FPS); f < FOLD[1] * FPS; f++) {
    const t = f / FPS;
    const envelope = envelopeAt(t)!;
    const centre = new Vector3(DL[0] / 2, DL[1] / 2, 0).applyMatrix4(envelope);
    const front = new Vector3(0, 0, 1).transformDirection(envelope);
    const toLens = new Vector3(...cameraAt(t).position).sub(centre).normalize();
    expect(toLens.dot(front), t.toFixed(2)).toBeGreaterThan(0.2);
  }
});

test("the film does not cut on the frame the Haustür shuts behind him: the coda holds on the shut door for 2 to 3 seconds of Nachlaufzeit", () => {
  const after = RUNDSCHREIBEN_DURATION - DOOR_SHUT;
  expect(after).toBeGreaterThanOrEqual(2);
  expect(after).toBeLessThanOrEqual(3);
  expect(SHOTS[SHOTS.length - 1].name).toBe("Coda");
});

test("over the Nachlaufzeit the camera eases back from the shut door, so the last seconds read as film and not as a still: it starts as the door shuts, travels half a metre or more and settles on the last frame", () => {
  const where = (t: number) => new Vector3(...cameraAt(t).position);
  const end = RUNDSCHREIBEN_DURATION - 1e-6;
  expect(where(DOOR_SHUT - 0.5).distanceTo(where(DOOR_SHUT - 0.3))).toBeLessThan(1e-9);
  expect(where(DOOR_SHUT - 0.3).distanceTo(where(end))).toBeGreaterThanOrEqual(0.5);
  expect(where(end).distanceTo(where(end - 1 / FPS))).toBeLessThan(0.002);
  const middle = (DOOR_SHUT + RUNDSCHREIBEN_DURATION) / 2;
  expect(where(middle).distanceTo(where(middle - 1 / FPS))).toBeGreaterThan(0.005);
  expect(where(end).distanceTo(new Vector3(...cameraAt(end).target))).toBeGreaterThan(where(DOOR_SHUT - 0.3).distanceTo(new Vector3(...cameraAt(DOOR_SHUT - 0.3).target)));
});

test.each(["wide", "tall"] as const)("%s: while the narration shows, every line the insert reads sits above the subtitle bar", (format) => {
  const problems: string[] = [];
  for (const t of insertSamples()) {
    const chunk = chunkAt(LETTER_READ, t, format);
    if (!chunk) continue;
    const top = barRect(chunk, format).top;
    for (const line of mustRead["Insert: the letter"]) {
      const [, y] = onScreen(onTheSheet(t, line.x, line.y + line.pt * PT), cameraAt(t, format), format);
      if (y > top) problems.push(`${t.toFixed(2)} s: "${line.text}" under the bar`);
    }
  }
  expect(problems.slice(0, 6)).toEqual([]);
});

test.each(["wide", "tall"] as const)("%s: once the letter insert has zoomed out, both his hands are in frame holding it, so the letter never floats", (format) => {
  const end = shot("Insert: the letter").to - 1 / FPS;
  const tibik = asCharacter(solveRundschreiben(end).tibik);
  for (const arm of ["leftArm", "rightArm"] as const) expect(seenBy(handPosition(RIG, tibik, arm), cameraAt(end, format), 0, format), arm).toBe(true);
});

test("in the point-of-view letter insert he is drawn arms only: the camera sits where his body is, so only his arms and hands show", () => {
  const scene = readFileSync(path.join("src", "scenes", "rundschreiben", "Rundschreiben.tsx"), "utf8");
  expect(scene.includes("armsOnly={shotAt(t).pov === true}")).toBe(true);
});

test.each(["wide", "tall"] as const)("%s: once the letter insert has zoomed out the world holds still and level: over its last half second the camera moves less than 2 mm and its up stays within a degree of the world's", (format) => {
  const { to } = shot("Insert: the letter");
  const end = cameraAt(to - 1 / FPS, format);
  for (let t = to - 0.5; t < to; t += 1 / FPS) {
    const setup = cameraAt(t, format);
    expect(new Vector3(...setup.position).distanceTo(new Vector3(...end.position)), t.toFixed(2)).toBeLessThan(0.002);
    expect(new Vector3(...(setup.up ?? [0, 1, 0])).angleTo(new Vector3(0, 1, 0)), t.toFixed(2)).toBeLessThan(Math.PI / 180);
  }
});
