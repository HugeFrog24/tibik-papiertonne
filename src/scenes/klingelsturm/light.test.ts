import { existsSync } from "node:fs";
import { expect, test } from "vitest";
import { FPS } from "../../timeline";
import { LINES } from "./choreography";
import { doorCues } from "./doorCues";
import { readWav } from "../../sound/wavFile";
import { LIGHT, LIGHT_BACK, lightsAt } from "./light";
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
  for (let f = 0; f < LIGHT.out * FPS - 1; f++)
    expect(lightsAt(f / FPS), (f / FPS).toFixed(2)).toBe(1);
  for (let f = Math.ceil(LIGHT.out * FPS); f < LIGHT_BACK[0] * FPS; f++)
    expect(lightsAt(f / FPS), (f / FPS).toFixed(2)).toBe(0);
});

const brightness = (samples: Float32Array, rate: number) => {
  let edge = 0;
  let energy = 0;
  for (let i = 1; i < Math.min(samples.length, 0.3 * rate); i++) {
    edge += (samples[i] - samples[i - 1]) ** 2;
    energy += samples[i] ** 2;
  }
  return edge / energy;
};

const tail = (samples: Float32Array, rate: number) => {
  let late = 0;
  let all = 0;
  samples.forEach((v, i) => {
    all += v * v;
    if (i > 0.25 * rate) late += v * v;
  });
  return late / all;
};

test("the timer relay clicks, damp and echoing, when the light goes out and when it comes back on", () => {
  const relays = doorCues().filter((c) => c.sound === "stairwell/relay");
  expect(relays.map((c) => c.at)).toHaveLength(2);
  expect(Math.abs(relays[0].at - LIGHT.out)).toBeLessThan(1 / FPS);
  expect(Math.abs(relays[1].at - LIGHT_BACK[0])).toBeLessThan(1 / FPS);
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

test("the solved scene carries the light", () => {
  for (const t of [0, lastWord(), LIGHT.out + 0.1, LIGHT_BACK[1] + 0.1])
    expect(solveKlingelsturm(t).lights).toBe(lightsAt(t));
});
