import { existsSync } from "node:fs";
import { expect, test } from "vitest";
import { TIMELINE_FPS } from "../../timeline";
import { LINES } from "./choreography";
import { doorCues } from "./doorCues";
import { readWav } from "../../sound/wavFile";
import { brightness, tail } from "../../sound/toneChecks";
import { LIGHT, LIGHT_BACK, lightsAt } from "./light";
import { CODA } from "./cigarette";
import { storyTime } from "./cameras";
import { solveKlingelsturm } from "./solve";

const lastWord = () => Math.max(...LINES.map((l) => l.to));

test("the timer is a real stairwell timer, switched on downstairs before the scene, and runs out right after the last word", () => {
  expect(LIGHT.timer).toBeGreaterThanOrEqual(30);
  expect(LIGHT.timer).toBeLessThanOrEqual(1200);
  expect(LIGHT.out - LIGHT.timer).toBeLessThan(0);
  expect(LIGHT.out - lastWord()).toBeGreaterThan(0);
  expect(LIGHT.out - lastWord()).toBeLessThan(3);
  expect(lightsAt(0)).toBe(1);
  expect(lightsAt(lastWord())).toBe(1);
  expect(lightsAt(LIGHT.out + 0.05)).toBe(0);
});

test("there is no warning blink: the light is fully on until the timer runs out, then dark until he presses the switch", () => {
  for (let f = 0; f < LIGHT.out * TIMELINE_FPS - 1; f++)
    expect(lightsAt(f / TIMELINE_FPS), (f / TIMELINE_FPS).toFixed(2)).toBe(1);
  for (let f = Math.ceil(LIGHT.out * TIMELINE_FPS); f < LIGHT_BACK[0] * TIMELINE_FPS; f++)
    expect(lightsAt(f / TIMELINE_FPS), (f / TIMELINE_FPS).toFixed(2)).toBe(0);
});

test("the timer relay clicks, damp and echoing, when the light goes out and when it comes back on", () => {
  const relays = doorCues().filter((c) => c.sound === "stairwell/relay");
  expect(relays.map((c) => c.at)).toHaveLength(3);
  expect(Math.abs(relays[0].at - LIGHT.out)).toBeLessThan(1 / TIMELINE_FPS);
  expect(Math.abs(relays[1].at - LIGHT_BACK[0])).toBeLessThan(1 / TIMELINE_FPS);
  expect(Math.abs(relays[2].at - CODA.outAgain)).toBeLessThan(1 / TIMELINE_FPS);
  expect(existsSync("public/sfx/stairwell/relay.wav")).toBe(true);
  const relay = readWav("stairwell/relay.wav");
  const button = readWav("stairwell/switch_002.wav");
  const DULLER = 0.75;
  expect(
    Math.sqrt(
      brightness(relay.samples, relay.rate) /
        brightness(button.samples, button.rate),
    ),
  ).toBeLessThan(DULLER);
  expect(tail(relay.samples, relay.rate)).toBeGreaterThan(
    tail(button.samples, button.rate),
  );
});

test("the solved scene carries the light", { timeout: 120_000 }, () => {
  for (const t of [0, lastWord(), LIGHT.out + 0.1, LIGHT_BACK[1] + 0.1])
    expect(solveKlingelsturm(t).lights).toBe(lightsAt(t));
});

test("the light goes out on her again exactly LIGHT.timer of story time after his press, with no warning blink", () => {
  expect(storyTime(CODA.outAgain) - LIGHT_BACK[0]).toBeCloseTo(LIGHT.timer, 6);
  for (let f = Math.ceil(LIGHT_BACK[1] * TIMELINE_FPS); f < Math.round(CODA.outAgain * TIMELINE_FPS); f++)
    expect(lightsAt(f / TIMELINE_FPS), (f / TIMELINE_FPS).toFixed(2)).toBe(1);
  for (let f = Math.round(CODA.outAgain * TIMELINE_FPS); f < Math.round(CODA.end * TIMELINE_FPS); f++)
    expect(lightsAt(f / TIMELINE_FPS), (f / TIMELINE_FPS).toFixed(2)).toBe(0);
});
