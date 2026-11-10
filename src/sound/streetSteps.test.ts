import { spawnSync } from "node:child_process";
import { expect, test } from "vitest";
import { stompFiles } from "../Karen/KarenStomp";
import { footstepPlan } from "./footsteps";

const levels = (file: string, filter = "") => {
  const out = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", `${filter}astats=measure_overall=RMS_level+Peak_level:measure_perchannel=none`, "-f", "null", "-"], { encoding: "utf8" }).stderr.split("Overall")[1];
  const value = (name: string) => Number(new RegExp(`${name} level dB: (-?[\\d.]+)`).exec(out)![1]);
  return { rms: value("RMS"), peak: value("Peak") };
};

const PHONE_SPEAKER = "highpass=f=300,highpass=f=300,";

test("on the dry street the steps play their phone-speaker versions; wet steps and the stairwell keep theirs", () => {
  const times = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5];
  expect(footstepPlan(times, 30).every((step) => /^street\/footstep_concrete_00\d\.wav$/.test(step.file))).toBe(true);
  expect(footstepPlan(times, 30, { surface: "wet" }).every((step) => /^footstep_wet_00\d\.ogg$/.test(step.file))).toBe(true);
  expect(footstepPlan(times, 30, { room: "stairwell" }).every((step) => step.file.startsWith("stairwell/"))).toBe(true);
  const stomp = stompFiles(0, "street");
  expect(stomp.step).toMatch(/^street\/footstep_concrete_00\d\.wav$/);
  expect(stomp.thud).toBe("street/impactSoft_heavy_000.wav");
});

test("the street versions carry on a phone speaker: what a small driver plays (above 300 Hz) is at least 6 dB louder for the steps and 12 dB for the stomp's thud, never above -1 dBFS", () => {
  const pairs = [
    ...[0, 1, 2, 3].map((n) => [`footstep_concrete_00${n}.ogg`, `street/footstep_concrete_00${n}.wav`, 6] as const),
    ["impactSoft_heavy_000.ogg", "street/impactSoft_heavy_000.wav", 12] as const,
  ];
  for (const [raw, street, lift] of pairs) {
    const before = levels(`public/sfx/${raw}`, PHONE_SPEAKER);
    const after = levels(`public/sfx/${street}`, PHONE_SPEAKER);
    expect(after.rms - before.rms, street).toBeGreaterThanOrEqual(lift);
    expect(levels(`public/sfx/${street}`).peak, street).toBeLessThanOrEqual(-0.9);
  }
});
