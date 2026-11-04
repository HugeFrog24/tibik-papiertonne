import { existsSync } from "node:fs";
import { expect, test } from "vitest";
import { touchdownTimes } from "../../characters/gait";
import { FPS } from "../../timeline";
import { KEYS } from "./calls";
import { KLINGELSTURM_DURATION, karenStandGait } from "./choreography";
import { OPEN, SHUT, UNLATCH, tibikGait } from "./door";
import { doorCues, inTheFlur, stompRoomAt } from "./doorCues";
import { EXIT_SOUNDS } from "./exit";
import { lightsAt } from "./light";
import { PACKING } from "./parcel";

const FRAME = 1 / FPS;

const cueNear = (sound: RegExp, at: number) =>
  doorCues().find((c) => sound.test(c.sound) && Math.abs(c.at - at) < FRAME);

const heard = (sound: RegExp, at: number, what: string) => {
  const cue = cueNear(sound, at);
  expect(cue, `${what} at ${at.toFixed(2)} s`).toBeDefined();
  expect(existsSync(`public/sfx/${cue!.sound}.wav`), cue!.sound).toBe(true);
};

test("his door is heard on the landing: latch and door when he opens it to the slit, door and latch when he shuts it", () => {
  heard(/metalLatch/, UNLATCH[0], "the latch giving");
  heard(/doorOpen/, OPEN[0], "the door opening");
  heard(/doorClose/, SHUT[1], "the door shutting");
  heard(/metalLatch/, SHUT[1] + 0.03, "the latch catching");
});

const hisSteps = () => touchdownTimes(tibikGait(), KLINGELSTURM_DURATION, FPS);

test("his steps behind the shut door are heard muffled on the landing, one per footfall", () => {
  const behind = hisSteps().filter(
    (t) => !inTheFlur(t) && t < EXIT_SOUNDS.doorOpens,
  );
  expect(behind.length).toBeGreaterThan(10);
  for (const t of behind)
    heard(/^flur\/footstep-door-\d$/, t, "his footfall behind the door");
  const muffled = doorCues().filter((c) => /footstep-door/.test(c.sound));
  expect(muffled).toHaveLength(behind.length);
});

test("once his door is open his steps are heard plainly in the stairwell, one per footfall", () => {
  const out = hisSteps().filter((t) => t >= EXIT_SOUNDS.doorOpens);
  expect(out.length).toBeGreaterThan(8);
  for (const t of out)
    heard(/^stairwell\/footstep_concrete_00\d$/, t, "his footfall outside");
  const plain = doorCues().filter((c) => /footstep_concrete/.test(c.sound));
  expect(plain).toHaveLength(out.length);
});

test("when he leaves, his door is heard opening, then shutting with its latch, and the light switch clicks", () => {
  heard(/doorOpen/, EXIT_SOUNDS.doorOpens, "his door opening");
  heard(/doorClose/, EXIT_SOUNDS.doorShuts, "his door shutting");
  heard(/metalLatch/, EXIT_SOUNDS.doorShuts + 0.03, "the latch catching");
  heard(/switch_002/, EXIT_SOUNDS.lightSwitch, "the light switch");
  expect(lightsAt(EXIT_SOUNDS.lightSwitch - 0.05)).toBe(0);
});

test("the parcel's flaps are heard folding shut in his Flur", () => {
  for (const t of [PACKING.ends, PACKING.near[1], PACKING.far[1]]) {
    expect(inTheFlur(t)).toBe(true);
    heard(/^flur\/flap$/, t, "a flap folding down");
  }
});

test("her red key clicks when she hangs up on the answering machine", () => {
  heard(/phone\/click/, KEYS[1].at, "the hang-up key");
});

test("her stomps heard while the camera is in his Flur come through his door, muffled", () => {
  const steps = touchdownTimes(karenStandGait(), KLINGELSTURM_DURATION, FPS);
  const inside = steps.filter(inTheFlur);
  expect(inside.length).toBeGreaterThan(0);
  for (const t of inside) expect(stompRoomAt(t), t.toFixed(2)).toBe("door");
  for (const t of steps.filter((s) => !inTheFlur(s)))
    expect(stompRoomAt(t), t.toFixed(2)).toBe("stairwell");
  for (const file of ["flur/thud-door", "flur/footstep-door-0"])
    expect(existsSync(`public/sfx/${file}.wav`), file).toBe(true);
});

test("every sound the landing's cues name exists in public/sfx", () => {
  const missing = doorCues()
    .map((c) => c.sound)
    .filter((sound) => !existsSync(`public/sfx/${sound}.wav`));
  expect([...new Set(missing)]).toEqual([]);
});
