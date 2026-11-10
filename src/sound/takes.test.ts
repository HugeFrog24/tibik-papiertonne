import { expect, test } from "vitest";
import { footstepName, footstepPlan } from "./footsteps";
import { stompFiles } from "../Karen/KarenStomp";
import { nuanceAt, nuancedTake, takeAt } from "./takes";

test("a recording's takes come in a seeded order that is the same on every render, never repeats a take back to back, uses every take, and is not a strict rotation", () => {
  const order = Array.from({ length: 40 }, (_, i) => takeAt("steps", i, 4));
  expect(Array.from({ length: 40 }, (_, i) => takeAt("steps", i, 4))).toEqual(order);
  for (let i = 1; i < order.length; i++) expect(order[i]).not.toBe(order[i - 1]);
  expect(new Set(order)).toEqual(new Set([0, 1, 2, 3]));
  expect(order).not.toEqual(Array.from({ length: 40 }, (_, i) => i % 4));
  expect(Array.from({ length: 40 }, (_, i) => takeAt("other", i, 4))).not.toEqual(order);
  expect(takeAt("one", 5, 1)).toBe(0);
});

test("nobody's footsteps cycle their takes in turn: a walker's steps and Karen's stomps never repeat a take back to back and are not a strict rotation", () => {
  const times = Array.from({ length: 24 }, (_, i) => 1 + i * 0.5);
  for (const [take, takes] of [[{ surface: "concrete" as const }, 4], [{ surface: "wet" as const }, 5], [{ surface: "concrete" as const, variant: 2 }, 4]] as const) {
    const files = footstepPlan(times, 30, take).map((s) => s.file);
    for (let i = 1; i < files.length; i++) expect(files[i]).not.toBe(files[i - 1]);
    expect(files).not.toEqual(times.map((_, i) => `footstep_${take.surface}_00${(i + ("variant" in take ? take.variant : 0)) % takes}.ogg`));
  }
  const stomps = Array.from({ length: 24 }, (_, i) => stompFiles(i, "street").step);
  for (let i = 1; i < stomps.length; i++) expect(stomps[i]).not.toBe(stomps[i - 1]);
  expect(stomps).not.toEqual(stomps.map((_, i) => `footstep_concrete_00${i % 4}.ogg`));
});

test("each footstep and stomp plays a hair higher or lower and louder or softer than the last, within 3 % in pitch and 1 dB in level, the same on every render", () => {
  const times = Array.from({ length: 16 }, (_, i) => 1 + i * 0.5);
  const steps = footstepPlan(times, 30, { surface: "concrete" });
  expect(footstepPlan(times, 30, { surface: "concrete" })).toEqual(steps);
  const stomps = Array.from({ length: 16 }, (_, i) => stompFiles(i, "street"));
  for (const { rate, gain } of [...steps, ...stomps]) {
    expect(Math.abs(rate - 1)).toBeLessThanOrEqual(0.03);
    expect(Math.abs(20 * Math.log10(gain))).toBeLessThanOrEqual(1);
  }
  expect(new Set(steps.map((s) => s.rate.toFixed(4))).size).toBeGreaterThan(8);
  expect(new Set(stomps.map((s) => s.gain.toFixed(4))).size).toBeGreaterThan(8);
});

test("a nuanced take is the seeded take played with its own nuance, both drawn from the one seed", () => {
  for (let i = 0; i < 12; i++) expect(nuancedTake("steps", i, 4)).toEqual({ take: takeAt("steps", i, 4), ...nuanceAt("steps", i) });
});

test("a footstep recording is named by its surface and take, the same in every scene", () => {
  expect(footstepName("concrete", 2)).toBe("footstep_concrete_002");
  expect(footstepName("wet", 4)).toBe("footstep_wet_004");
});
