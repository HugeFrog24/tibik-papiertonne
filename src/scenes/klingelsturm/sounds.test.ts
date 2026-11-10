import { existsSync, readFileSync } from "node:fs";
import { Vector3 } from "three";
import { expect, test } from "vitest";
import { touchdownTimes } from "../../characters/gait";
import { heardAt } from "../../sound/perspective";
import { nuanceAt } from "../../sound/takes";
import { storyJumpsIn } from "../../toon/shots";
import { soundSeconds } from "../../sound/soundLength";
import { SHOTS, cameraAt } from "./cameras";
import { CODA } from "./cigarette";
import { tibikAt } from "./door";
import { FPS } from "../../timeline";
import { HOLD_MUSIC, KEYS, phoneCues } from "./calls";
import { LINES } from "./choreography";
import { KLINGELSTURM_DURATION, karenStandGait } from "./choreography";
import { OPEN, SHUT, UNLATCH, tibikGait } from "./door";
import { TAPE_PULL, doorCues, inTheFlur, stompRoomAt, type BellCue } from "./doorCues";
import { EXIT_SOUNDS } from "./exit";
import { lightsAt } from "./light";
import { PACKING } from "./parcel";
import { BANGING } from "./banging";
import { readWav } from "../../sound/wavFile";
import { bandShare, brightness, lowShare, peakOf, rmsDb, tail } from "../../sound/toneChecks";
import { expectFilesCredited, expectSfx } from "../../sound/creditChecks";
import { BLOW_TAKES } from "./offenceCues";

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
  const muffled = doorCues().filter((c) => c.sound.includes('footstep-door'));
  expect(muffled).toHaveLength(behind.length);
});

test("once his door is open his steps are heard plainly in the stairwell, one per footfall", () => {
  const out = hisSteps().filter((t) => t >= EXIT_SOUNDS.doorOpens && t < CODA.jumpCut);
  expect(out.length).toBeGreaterThan(8);
  for (const t of out)
    heard(/^stairwell\/footstep_concrete_00\d$/, t, "his footfall outside");
  const plain = doorCues().filter((c) => /^stairwell\/footstep_concrete_00\d$/.test(c.sound));
  expect(plain.length).toBeLessThanOrEqual(out.length);
  expect(new Set(doorCues().filter((c) => c.sound.includes('footstep_concrete')).map((c) => c.at)).size).toBe(out.length);
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

const BLOW_SOUND = /door-pound/;
const RATTLE_SOUND = /impactMetal_light|latch-rattle/;
const blowCue = (at: number) => cueNear(BLOW_SOUND, at);
const loudness = (cue: { readonly sound: string; readonly volume: number }) => cue.volume * peakOf(readWav(`${cue.sound}.wav`).samples);

const POUNDING = { hit: [0, 0.15] as const, loud: -15, overStomp: 6, mids: [200, 2000] as const, carried: 0.4, below: 150, rumble: 0.4, ring: [1.0, 1.5] as const, rings: -34 };

test("her fist on his door bangs on any speaker: every blow take is loud, carried in the mids rather than a rumble below 150 Hz, and on the landing the stairwell still rings a second later", () => {
  BANGING.blows.forEach((at, i) => {
    const cue = blowCue(at)!;
    const { rate, samples } = readWav(`${cue.sound}.wav`);
    const level = rmsDb(samples, rate, ...POUNDING.hit) + 20 * Math.log10(cue.volume);
    expect(level, `blow ${i + 1} (${cue.sound}) level`).toBeGreaterThan(POUNDING.loud);
    expect(bandShare(samples, rate, ...POUNDING.mids), `blow ${i + 1} (${cue.sound}) mids`).toBeGreaterThan(POUNDING.carried);
    expect(lowShare(samples, rate, POUNDING.below), `blow ${i + 1} (${cue.sound}) rumble`).toBeLessThan(POUNDING.rumble);
    if (!inTheFlur(at)) expect(rmsDb(samples, rate, ...POUNDING.ring), `blow ${i + 1} (${cue.sound}) ring`).toBeGreaterThan(POUNDING.rings);
  });
});

test("each blow sounds on its contact frame, the stairwell take on the landing, the door take in the Flur", () => {
  BANGING.blows.forEach((at, i) => {
    const cue = blowCue(at);
    expect(cue, `blow ${i + 1}`).toBeDefined();
    expect(cue!.sound).toMatch(i < 4 ? /^stairwell\/pound\/door-pound-\d$/ : /^flur\/door-pound-\d$/);
    expect(existsSync(`public/sfx/${cue!.sound}.wav`), cue!.sound).toBe(true);
  });
  expect(new Set(BANGING.blows.map((at) => blowCue(at)!.sound)).size).toBeGreaterThanOrEqual(5);
});

test("the latch rattle follows each blow, quieter than the blow", () => {
  for (const at of BANGING.blows) {
    const blow = blowCue(at)!;
    const rattle = doorCues().find((c) => RATTLE_SOUND.test(c.sound) && c.at >= blow.at && c.at - blow.at <= FRAME);
    expect(rattle, `rattle after ${at}`).toBeDefined();
    expectSfx([`${rattle!.sound}.wav`]);
    expect(loudness(rattle!)).toBeLessThan(loudness(blow) / 3);
  }
});

test("heard in his Flur a blow is duller than on the landing and has no stairwell tail", () => {
  for (const n of BLOW_TAKES) {
    const door = readWav(`flur/door-pound-${n}.wav`);
    const landing = readWav(`stairwell/pound/door-pound-${n}.wav`);
    expect(brightness(door.samples, door.rate), `take ${n}`).toBeLessThan(brightness(landing.samples, landing.rate));
    expect(tail(door.samples, door.rate), `take ${n}`).toBeLessThan(tail(landing.samples, landing.rate));
  }
});

const hitLevel = (sound: string, volume: number) => {
  const { rate, samples } = readWav(`${sound}.wav`);
  return rmsDb(samples, rate, ...POUNDING.hit) + 20 * Math.log10(volume);
};

const RATTLE = { above: 4000, bright: 0.25, quieter: 6 };

test("the latch rattle under each blow is a dull, quiet clatter, not a ting: little of it above 4 kHz and a sixth as loud as the blow at most", () => {
  BANGING.blows.forEach((at, i) => {
    const rattle = cueNear(RATTLE_SOUND, at + 0.01)!;
    const { rate, samples } = readWav(`${rattle.sound}.wav`);
    expect(1 - lowShare(samples, rate, RATTLE.above), `rattle ${i + 1} (${rattle.sound}) brightness`).toBeLessThan(RATTLE.bright);
    expect(loudness(rattle), `rattle ${i + 1}`).toBeLessThanOrEqual(loudness(blowCue(at)!) / RATTLE.quieter);
  });
});

test("a blow on the landing is far louder than her stomp, as a fist on a hollow door is than footsteps: at least 6 dB over the hit", () => {
  const stomp = Math.max(hitLevel("stairwell/footstep_concrete_000", 1), hitLevel("stairwell/impactSoft_heavy_000", 0.6));
  for (const at of BANGING.blows.slice(0, 4)) {
    const cue = blowCue(at)!;
    expect(hitLevel(cue.sound, cue.volume), `blow @${at}`).toBeGreaterThan(stomp + POUNDING.overStomp);
  }
});

test("a blow's stairwell echo stops at the cut into his Flur, where the door takes over", () => {
  const flurCut = SHOTS.find((s) => s.name === "Flur: the banging")!.from;
  for (const at of BANGING.blows.filter((t) => t < flurCut)) {
    const cue = blowCue(at)!;
    expect(cue.length, `blow @${at}`).toBeDefined();
    expect(at + cue.length!, `blow @${at}`).toBeLessThanOrEqual(flurCut + 1e-9);
  }
});

test("she pants through the beat and the walk back", () => {
  const pants = doorCues().filter((c) => c.sound.includes('panting'));
  const covered = (t: number) => pants.some((c) => c.at <= t + 1e-9 && c.at + (c.length ?? 0) >= t - 1e-9);
  for (let t: number = BANGING.blows[3]; t <= BANGING.raise[0]; t += 0.1) expect(covered(t), t.toFixed(2)).toBe(true);
});

test("every new banging file exists and the Kenney takes are credited", () => {
  expectFilesCredited(
    [...BLOW_TAKES.flatMap((n) => [`impactPunch_heavy_00${n}.ogg`, `impactPlank_medium_00${n}.ogg`, `impactMetal_light_00${n}.ogg`]), "wood_slam_01.ogg", "wood_slam_03.ogg", "wood_slam_04.ogg", "wood_close_01.ogg", "wood_close_02.ogg"],
  );
  expectSfx(BLOW_TAKES.flatMap((n) => [`pound/door-pound-${n}.wav`, `stairwell/pound/door-pound-${n}.wav`, `pound/latch-rattle-${n}.wav`, `stairwell/pound/latch-rattle-${n}.wav`, `flur/door-pound-${n}.wav`]));
});

const coda = (sound: string) => doorCues().filter((c) => c.sound === `stairwell/coda/${sound}`);
const spans = (cue: BellCue, [from, to]: readonly [number, number]) =>
  Math.abs(cue.at - from) < FRAME && cue.length !== undefined && Math.abs(cue.at + cue.length - to) < FRAME;
const CODA_SOUNDS = ["lighter-strike", "lighter-hiss", "lighter-release", "drag", "inhale", "exhale"];

test("the lighter strikes twice, each spark on its strike and the two a touch apart in level; the gas hisses while each flame burns and the lever clicks back each time she lets go", () => {
  heard(/^stairwell\/cloth2$/, CODA.phoneAway[0], "the phone going into her pocket");
  const wheels = coda("lighter-strike").sort((a, b) => a.at - b.at);
  expect(wheels, "the flint wheel").toHaveLength(2);
  const struck = readWav(`${wheels[0].sound}.wav`);
  const spark = struck.samples.reduce((best, v, i, all) => (Math.abs(v) > Math.abs(all[best]) ? i : best), 0) / struck.rate;
  wheels.forEach((wheel, i) => { expect(Math.abs(wheel.at + spark - CODA.strikes[i]), `strike ${i + 1}'s spark`).toBeLessThan(FRAME); });
  expect(wheels[0].volume).not.toBe(wheels[1].volume);
  const hiss = coda("lighter-hiss").sort((a, b) => a.at - b.at);
  expect(hiss).toHaveLength(2);
  expect(spans(hiss[0], CODA.coldStart), JSON.stringify(hiss[0])).toBe(true);
  expect(spans(hiss[1], CODA.flame), JSON.stringify(hiss[1])).toBe(true);
  heard(/^stairwell\/coda\/lighter-release$/, CODA.coldStart[1], "the gas lever let go after the first strike");
  heard(/^stairwell\/coda\/lighter-release$/, CODA.flame[1], "the gas lever let go");
  const strike = loudness(wheels[1]);
  expect(loudness(hiss[1])).toBeLessThan(strike / 3);
  expect(loudness(cueNear(/lighter-release/, CODA.flame[1])!)).toBeLessThan(strike);
});

test("every draw crackles and every exhale breathes, all through the stairwell", () => {
  const drags = coda("drag");
  expect(drags).toHaveLength(3);
  for (const draw of [...CODA.draws, CODA.laterDraw]) expect(drags.some((c) => spans(c, draw)), `draw @${draw[0]}`).toBe(true);
  const inhales = coda("inhale");
  expect(inhales).toHaveLength(2);
  for (const breath of [[CODA.draws[0][0], CODA.exhale[0]], [CODA.laterDraw[0], CODA.darkExhale[0]]] as const)
    expect(inhales.some((c) => spans(c, breath)), `inhale @${breath[0]}`).toBe(true);
  expect(coda("exhale").map((c) => c.at)).toEqual([CODA.exhale[0], CODA.darkExhale[0]]);
  for (const cue of doorCues().filter((c) => c.at >= CODA.phoneAway[0])) expect(cue.sound, cue.name).toMatch(/^stairwell\//);
});

type Footfall = { readonly at: number; readonly volume: number; readonly steady: number; readonly far: number };

const footfallsOut = (): Footfall[] => {
  const cues = doorCues().filter((c) => c.sound.includes('footstep_concrete'));
  return [...new Set(cues.map((c) => c.at))].map((at, i) => {
    const here = cues.filter((c) => c.at === at);
    const volume = here.reduce((sum, c) => sum + c.volume, 0);
    const far = here.filter((c) => c.sound.endsWith("-far")).reduce((sum, c) => sum + c.volume, 0);
    return { at, volume, steady: volume / nuanceAt("stairwell:out", i).gain, far: far / volume };
  });
};

test("his steps fade as he goes down and stop at the jump cut: past their slight step-to-step nuance, each is as loud as its distance allows", () => {
  const out = footfallsOut();
  const offScreen = out.filter((c) => c.at > CODA.mediumCut);
  expect(offScreen.length).toBeGreaterThanOrEqual(5);
  expect(CODA.jumpCut - offScreen[offScreen.length - 1].at).toBeLessThan(0.6);
  for (const cue of doorCues().filter((c) => c.sound.includes('footstep_concrete'))) expect(cue.at + (cue.length ?? Infinity), cue.name).toBeLessThanOrEqual(CODA.jumpCut + 1e-6);
  const level = (step: Footfall) => step.steady / heardAt(tibikAt(step.at).position, cameraAt(step.at).position, 2.5);
  for (const step of out) expect(level(step), String(step.at)).toBeCloseTo(level(out[0]), 9);
  offScreen.slice(1).forEach((step, i) => { expect(step.steady, String(step.at)).toBeLessThan(offScreen[i].steady); });
  expect(offScreen[offScreen.length - 1].steady).toBeLessThan(0.6 * Math.max(...out.map((c) => c.steady)));
});

test("going down the flight his steps sound further away, not only quieter: the far take, duller and more echoing, takes over with distance", () => {
  for (const n of [0, 1, 2, 3]) {
    const near = readWav(`stairwell/footstep_concrete_00${n}.wav`);
    const far = readWav(`stairwell/footstep_concrete_00${n}-far.wav`);
    expect(brightness(far.samples, far.rate), `take ${n}`).toBeLessThan(brightness(near.samples, near.rate));
    expect(tail(far.samples, far.rate), `take ${n}`).toBeGreaterThan(tail(near.samples, near.rate));
  }
  const out = footfallsOut();
  const distance = (step: Footfall) => new Vector3(...tibikAt(step.at).position).distanceTo(new Vector3(...cameraAt(step.at).position));
  for (const step of out.filter((s) => distance(s) <= 2.5)) expect(step.far, String(step.at)).toBe(0);
  const offScreen = out.filter((c) => c.at > CODA.mediumCut);
  offScreen.slice(1).forEach((step, i) => { expect(step.far, String(step.at)).toBeGreaterThanOrEqual(offScreen[i].far); });
  expect(offScreen[offScreen.length - 1].far).toBeGreaterThan(0.5);
});

test("every new file exists, comes from a CC0 or public-domain recording and is credited", () => {
  expectSfx([...CODA_SOUNDS.flatMap((f) => [`coda/${f}.wav`, `stairwell/coda/${f}.wav`]), "stairwell/cloth2.wav"]);
  const recordings = JSON.parse(readFileSync("assets/recordings/recordings.json", "utf8")) as Record<"cigarette" | "breath", { file: string; license: string; source: string }[]>;
  const sources = [...recordings.cigarette, ...recordings.breath];
  expect(sources.length).toBeGreaterThanOrEqual(2);
  const credits = readFileSync("public/sfx/CREDITS.md", "utf8");
  for (const recording of sources) {
    expect(existsSync(`assets/recordings/${recording.file}`), recording.file).toBe(true);
    expect(recording.license).toMatch(/^(CC0|Public domain)/);
    expect(credits).toContain(recording.source);
  }
  for (const file of CODA_SOUNDS) expect(credits).toContain(`coda/${file}.wav`);
});

test("no Klingelsturm sound runs over the cut into the rain, and none from before the jump runs over the jump cut", () => {
  expect(storyJumpsIn(SHOTS)).toEqual([CODA.jumpCut]);
  for (const cue of doorCues()) {
    const ends = cue.at + (cue.length ?? soundSeconds(`${cue.sound}.wav`) - (cue.skip ?? 0));
    expect(ends, cue.name).toBeLessThanOrEqual(KLINGELSTURM_DURATION + 1e-6);
    if (cue.at < CODA.jumpCut) expect(ends, cue.name).toBeLessThanOrEqual(CODA.jumpCut + 1e-6);
  }
});

test("every coda sound is heard over the street bed and none is louder than the strike", () => {
  const strike = loudness(doorCues().find((c) => c.sound === "stairwell/coda/lighter-strike")!);
  const quiet = ["stairwell/cloth2", ...["drag", "inhale", "exhale", "lighter-release"].map((name) => `stairwell/coda/${name}`)];
  for (const sound of quiet)
    for (const cue of doorCues().filter((c) => c.sound === sound)) {
      expect(loudness(cue), cue.name).toBeGreaterThanOrEqual(0.03);
      expect(loudness(cue), cue.name).toBeLessThan(strike);
    }
});

const envelopeOf = (samples: Float32Array, rate: number) => {
  const step = Math.round(rate / 1000);
  return Array.from({ length: Math.floor(samples.length / step) }, (_, i) => {
    let sum = 0;
    for (let j = i * step; j < (i + 1) * step; j++) sum += samples[j] * samples[j];
    return Math.sqrt(sum / step);
  });
};

const correlation = (a: number[], lag: number) => {
  const n = a.length - lag;
  const mean = a.reduce((s, v) => s + v, 0) / a.length;
  let ab = 0;
  let aa = 0;
  let bb = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] - mean;
    const y = a[i + lag] - mean;
    ab += x * y;
    aa += x * x;
    bb += y * y;
  }
  return ab / Math.sqrt(aa * bb);
};

test("the gas hiss is a steady rush: no click in it and no loop you could hear", () => {
  const { samples, rate } = readWav("coda/lighter-hiss.wav");
  const settled = samples.subarray(Math.round(0.15 * rate), Math.round(1.5 * rate));
  const envelope = envelopeOf(settled, rate);
  const level = Math.sqrt(settled.reduce((s, v) => s + v * v, 0) / settled.length);
  const loudest10ms = Math.max(...Array.from({ length: envelope.length - 10 }, (_, i) => Math.hypot(...envelope.slice(i, i + 10)) / Math.sqrt(10)));
  expect(loudest10ms / level).toBeLessThan(2);
  const repeats = Array.from({ length: 950 }, (_, i) => correlation(envelope, 50 + i));
  expect(Math.max(...repeats)).toBeLessThan(0.3);
});

test("his tape is heard faintly through his door while we are on the landing and plainly once we cut into his Flur", () => {
  const tape = doorCues().filter((c) => c.sound.includes('tape-pull'));
  expect(tape.length).toBeGreaterThan(0);
  for (const cue of tape) {
    const middle = cue.at + (cue.length ?? 0.05) / 2;
    expect(cue.sound, cue.name).toBe(inTheFlur(middle) ? "flur/tape-pull" : "flur/tape-pull-door");
  }
  const plain = readWav("flur/tape-pull.wav").samples;
  const door = readWav("flur/tape-pull-door.wav").samples;
  expect(20 * Math.log10(peakOf(door) / peakOf(plain))).toBeLessThan(-12);
});

test("the tape cues last as long as the tape file", () => {
  expect(TAPE_PULL.seconds).toBeCloseTo(soundSeconds(`${TAPE_PULL.sound}.wav`), 2);
});

test("her panting dies away over its last second instead of stopping dead, and has faded by the time she shouts at his door", () => {
  const pants = doorCues().filter((c) => c.sound.includes('panting'));
  expect(pants.length).toBeGreaterThan(0);
  const ends = new Map<string, BellCue>();
  for (const c of pants) ends.set(c.name.replace(/ (on the landing|through his door) @[0-9.]+$/, ""), c);
  for (const last of ends.values()) expect(last.fadeOut).toBeGreaterThanOrEqual(1);
  const shout = LINES.find((l) => l.name === "Karen: Ey")!;
  const first = [...ends.values()].sort((x, y) => x.at - y.at)[0];
  expect(first.at + (first.length ?? 0) + (first.restAfter ?? 0)).toBeLessThanOrEqual(shout.from + 1e-9);
});

test("her blows on his door never repeat a take back to back, vary in level by about a decibel, the two after the pause land softer as her arm tires, and his door knocks once more on its latch after the last blow", () => {
  const blows = BANGING.blows.map((at) => doorCues().filter((c) => /door-pound-\d$/.test(c.sound) && Math.abs(c.at - at) < 1e-6));
  const takes = blows.map((cues) => Number(cues[0].sound.slice(-1)));
  for (let i = 1; i < takes.length; i++) expect(takes[i]).not.toBe(takes[i - 1]);
  const levels = blows.map((cues) => 20 * Math.log10(cues[0].volume));
  const first = levels.slice(0, 4);
  expect(Math.max(...first) - Math.min(...first)).toBeGreaterThan(0.3);
  expect(Math.max(...first) - Math.min(...first)).toBeLessThanOrEqual(2.01);
  for (const tired of levels.slice(4)) expect(tired).toBeLessThan(Math.min(...first));
  const last = BANGING.blows[BANGING.blows.length - 1];
  const settles = doorCues().filter((c) => c.sound.includes('latch-rattle') && c.at > last + 0.05 && c.at < last + 0.4);
  expect(settles).toHaveLength(1);
});

test("his steps behind his door and on his way out come in a seeded order of takes, never back to back and not a strict rotation, each a hair higher or lower and louder or softer", () => {
  const takeOf = (cue: BellCue) => Number(/(\d)(-far)?$/.exec(cue.sound)![1]);
  for (const name of [/^Tibik steps behind his door/, /^Tibik steps out @/]) {
    const steps = doorCues().filter((cue) => name.test(cue.name)).sort((a, b) => a.at - b.at);
    expect(steps.length, String(name)).toBeGreaterThan(6);
    const takes = steps.map(takeOf);
    for (let i = 1; i < takes.length; i++) expect(takes[i], `${name} step ${i}`).not.toBe(takes[i - 1]);
    expect(takes, String(name)).not.toEqual(takes.map((_, i) => i % 4));
    for (const { rate } of steps) expect(Math.abs((rate ?? 1) - 1)).toBeLessThanOrEqual(0.03);
    expect(new Set(steps.map((step) => (step.rate ?? 1).toFixed(4))).size, String(name)).toBeGreaterThan(steps.length / 2);
  }
});

test("the answering machine plays its hold music under the announcement, through her speakerphone into the stairwell: from the moment it picks up until its last words, faded out before the beep, well under the voice", () => {
  const cues = phoneCues();
  const machine = LINES.filter((line) => line.speaker === "phone" && line.from < KEYS[KEYS.length - 1].at);
  const music = cues.find((cue) => cue.sound === HOLD_MUSIC.sound)!;
  const beep = cues.find((cue) => cue.sound === "beep")!;
  expect(music.at).toBeCloseTo(machine[0].from, 9);
  expect(music.at + music.length!).toBeCloseTo(machine[machine.length - 1].to, 9);
  expect(music.at + music.length!).toBeLessThanOrEqual(beep.at);
  expect(music.fadeOut).toBeGreaterThan(0.1);
  expectFilesCredited([`phone/${HOLD_MUSIC.sound}.wav`, `stairwell/phone/${HOLD_MUSIC.sound}.wav`]);
  const { samples, rate } = readWav(`stairwell/phone/${HOLD_MUSIC.sound}.wav`);
  expect(samples.length / rate).toBeGreaterThanOrEqual(music.length! + 1);
  expect(bandShare(samples, rate, 300, 3400)).toBeGreaterThan(0.8);
  expect(rmsDb(samples, rate, 0, 0.1)).toBeLessThan(rmsDb(samples, rate, 1, 2) - 6);
  expect(20 * Math.log10(music.volume)).toBeLessThanOrEqual(-10);
});
