import { Vector3 } from "three";
import { phoneCues } from "./calls";
import type { Hold } from "../../physics/holds";
import { readWav } from "../../sound/wavFile";
import { expect, test } from "vitest";
import { CHEST, CHIME, FLUR_SOLIDS } from "../../building/flurShape";
import { doorFrame } from "../../building/doors";
import { FLUR, TIBIK_DOOR } from "../../building/stairwell";
import { mouthInWorld, seenBy } from "../../dialogue/screen";
import { RIG } from "../../Tibik/rig";
import { doorCues } from "./doorCues";
import { SHOTS, cameraAt, shotAt } from "./cameras";
import { contacts, sphereObbGap, type Obb } from "../../physics/collision";
import { TIMELINE_FPS } from "../../timeline";
import { LEAN_TO_THE_LEVER, LEVER_HOLD, OPEN, SHUT, TIBIK_AT_THE_GAP, UNLATCH, tibikAt } from "./door";
import {
  AT_THE_CHEST,
  BOOK,
  PACKING,
  PACKING_HOLDS,
  PARCEL,
  TAPE,
  TAPE_ROLL,
  TAPE_PUT_DOWN,
  TAPE_STRIPS,
  TAPING,
  TAPING_AGAIN,
  parcelBody,
  parcelClosedAt,
  parcelSolids,
  stripPiecesAt,
  tapeRollSolid,
  tapeStripAt,
  tapingHoldsOf,
} from "./parcel";
import { KLINGELSTURM_DURATION } from "./choreography";
import { FOUND_KARTON_SIZE, PANEL } from "../../street/kartonShape";
import { solveKlingelsturm, tibikViolations } from "./solve";
import { GENTLE_ARM, armJumpsOver, framesThrough, handsOffHolds, mm, tibikIn } from "../sceneChecks";

const chestTop = CHEST.center[1] + CHEST.size[1] / 2;
const span = (center: number, size: number) => [
  center - size / 2,
  center + size / 2,
];
const onTheChest = (center: readonly number[], size: readonly number[]) => {
  const [x0, x1] = span(CHEST.center[0], CHEST.size[0]);
  const [z0, z1] = span(CHEST.center[2], CHEST.size[2]);
  return (
    center[0] - size[0] / 2 >= x0 &&
    center[0] + size[0] / 2 <= x1 &&
    center[2] - size[2] / 2 >= z0 &&
    center[2] + size[2] / 2 <= z1
  );
};

const tibikThrough = (from: number, to: number) => {
  const problems: string[] = [];
  for (let f = from; f <= to; f++) {
    const t = f / TIMELINE_FPS;
    for (const c of tibikViolations(solveKlingelsturm(t)))
      if (c.depth > 0.005) problems.push(`${t.toFixed(2)} s: ${c.a} in ${c.b}`);
  }
  return problems.slice(0, 5);
};

test("the parcel stands on his chest of drawers, the book inside it, the tape dispenser beside it", () => {
  const body = parcelBody();
  const bottom = body.center.y - body.half[1];
  expect(Math.abs(bottom - chestTop)).toBeLessThan(0.003);
  expect(onTheChest(TAPE.center, TAPE.size)).toBe(true);
  expect(Math.abs(TAPE.center[1] - TAPE.size[1] / 2 - chestTop)).toBeLessThan(
    0.003,
  );
  const book = new Vector3(...BOOK.center).sub(body.center);
  body.axes.forEach((axis, k) => {
    const reach = [axis.x, axis.y, axis.z].reduce(
      (sum, a, j) => sum + (Math.abs(a) * BOOK.size[j]) / 2,
      0,
    );
    expect(Math.abs(book.dot(axis)) + reach).toBeLessThanOrEqual(
      body.half[k] + 1e-9,
    );
  });
  expect(contacts([tapeRollSolid(0)], [body])).toEqual([]);
});

test("the flaps are open before the packing and closed by its end", () => {
  expect(parcelClosedAt(PACKING.from - 0.01)).toBe(0);
  expect(parcelClosedAt(PACKING.to)).toBe(1);
  expect(parcelClosedAt(60)).toBe(1);
});

test("Tibik packs at his chest, then turns and is at his door before the spyhole shot", () => {
  for (let t = 0; t <= PACKING.to; t += 0.1) {
    const { position, rotationY } = tibikAt(t);
    expect(Math.abs(position[0] - AT_THE_CHEST.x)).toBeLessThan(0.02);
    expect(Math.abs(position[2] - AT_THE_CHEST.z)).toBeLessThan(0.02);
    expect(Math.cos(rotationY - AT_THE_CHEST.yaw)).toBeGreaterThan(0.99);
  }
  const at = tibikAt(6.0);
  expect(Math.abs(at.position[0] - TIBIK_AT_THE_GAP.x)).toBeLessThan(0.02);
  expect(Math.abs(at.position[2] - TIBIK_AT_THE_GAP.z)).toBeLessThan(0.02);
});

test(
  "in his Flur Tibik passes through nothing, the parcel included",
  { timeout: 300_000 },
  () => {
    expect(tibikThrough(0, 6 * TIMELINE_FPS)).toEqual([]);
  },
);

test("both Flur shots show Tibik's face, the parcel, his door and the chime, around the folding and the taping", () => {
  const packing = SHOTS.find((s) => s.name === "Flur: packing")!;
  expect(packing.from).toBeLessThanOrEqual(PACKING.from);
  expect(packing.to).toBeGreaterThanOrEqual(PACKING.to);
  const taping = SHOTS.find((s) => s.name === "Flur: taping")!;
  expect(taping.from).toBeLessThanOrEqual(TAPING.pick);
  expect(taping.to).toBeGreaterThanOrEqual(TAPING.end);
  const times = [packing, taping].flatMap((shot) =>
    Array.from(
      { length: Math.ceil((shot.to - shot.from) / 0.25) },
      (_, i) => shot.from + i * 0.25,
    ),
  );
  for (const t of times) {
    const setup = cameraAt(t);
    const eye = new Vector3(...setup.position);
    const door = new Vector3(
      TIBIK_DOOR.width / 2,
      TIBIK_DOOR.height / 2,
      0,
    ).applyMatrix4(doorFrame(TIBIK_DOOR, 0));
    const things = {
      face: mouthInWorld(RIG, solveKlingelsturm(t).tibik),
      parcel: new Vector3(...PARCEL.position),
      door,
      chime: new Vector3(...CHIME.center),
    };
    for (const [name, p] of Object.entries(things)) {
      expect(seenBy(p, setup), `${name} at ${t.toFixed(2)} s`).toBe(true);
    }
    expect(eye.x).toBeGreaterThan(FLUR.x0);
    expect(eye.x).toBeLessThan(FLUR.x1);
    expect(eye.z).toBeGreaterThan(FLUR.z0);
    expect(eye.z).toBeLessThan(FLUR.z1);
  }
});

test(
  "his hands are on the flaps while he folds them, both hands, ends first",
  { timeout: 300_000 },
  () => {
    expect(PACKING_HOLDS.filter((h) => h.arm === "leftArm")).toHaveLength(2);
    expect(PACKING_HOLDS.filter((h) => h.arm === "rightArm")).toHaveLength(2);
    expect(handsOff(PACKING_HOLDS).slice(0, 6)).toEqual([]);
  },
);

test("her panting is heard plainly on the landing and muffled through his door in the Flur", () => {
  const panting = doorCues().filter((c) => c.name.startsWith("Karen pants"));
  const pants = phoneCues().find((c) => c.name === "Karen pants")!;
  for (let t = 0.01; t < pants.at + (pants.length ?? 0); t += 0.05) {
    const playing = panting.filter(
      (c) => t >= c.at && t < c.at + (c.length ?? 0),
    );
    expect(playing, `${t.toFixed(2)} s`).toHaveLength(1);
    const inFlur = shotAt(t).name === "Flur: packing";
    expect(playing[0].sound).toBe(
      inFlur ? "stairwell/phone/panting-door" : "stairwell/phone/panting",
    );
    expect(playing[0].skip ?? 0).toBeCloseTo(playing[0].at, 9);
  }
});

test("after shutting his door he walks back to his chest and faces the parcel while he tapes it", () => {
  const atTheDoor = tibikAt(SHUT[1]);
  expect(Math.abs(atTheDoor.position[0] - TIBIK_AT_THE_GAP.x)).toBeLessThan(
    0.02,
  );
  expect(Math.abs(atTheDoor.position[2] - TIBIK_AT_THE_GAP.z)).toBeLessThan(
    0.02,
  );
  for (let t = TAPING.at; t <= TAPING.done; t += 0.1) {
    const { position, rotationY } = tibikAt(t);
    expect(Math.abs(position[0] - AT_THE_CHEST.x), t.toFixed(1)).toBeLessThan(
      0.02,
    );
    expect(Math.abs(position[2] - AT_THE_CHEST.z), t.toFixed(1)).toBeLessThan(
      0.02,
    );
    expect(
      Math.cos(rotationY - AT_THE_CHEST.yaw),
      t.toFixed(1),
    ).toBeGreaterThan(0.99);
  }
  expect(TAPING.at - SHUT[1]).toBeGreaterThan(1);
});

test("the tape screeches in his Flur exactly while he pulls it across the lid", () => {
  const { rate, samples } = readWav("flur/tape-pull.wav");
  const window = Math.round(rate * 0.01);
  const levels: number[] = [];
  for (let i = 0; i + window <= samples.length; i += window) {
    let sum = 0;
    for (let k = i; k < i + window; k++) sum += samples[k] * samples[k];
    levels.push(10 * Math.log10(sum / window + 1e-12));
  }
  const peak = Math.max(...levels);
  const loud = levels.flatMap((l, i) => (l > peak - 20 ? [i * 0.01] : []));
  const onset = loud[0];
  const pull = loud[loud.length - 1] - onset;
  expect(Math.abs(pull - (TAPING.end - TAPING.start))).toBeLessThan(0.1);
  const cue = doorCues().find((c) => c.sound === "flur/tape-pull")!;
  expect(cue).toBeDefined();
  expect(Math.abs(cue.at + onset - TAPING.start)).toBeLessThan(1 / TIMELINE_FPS);
  expect(shotAt(TAPING.start).name).toMatch(/^Flur/);
  expect(shotAt(TAPING.end).name).toMatch(/^Flur/);
});

const handsOff = (holds: readonly Hold[]) => handsOffHolds(holds, (t) => tibikIn(solveKlingelsturm)(t).Tibik).off;

const extent = (o: Obb, axis: Vector3) =>
  o.axes.reduce((sum, a, k) => sum + Math.abs(a.dot(axis)) * o.half[k], 0);

test("the packing tape is a 50 mm roll on a 76 mm core that rests on the chest before and after the taping", () => {
  expect(TAPE_ROLL.width).toBeCloseTo(0.05, 6);
  expect(TAPE_ROLL.core).toBeCloseTo(0.038, 6);
  expect(TAPE_ROLL.radius).toBeGreaterThan(0.048);
  expect(TAPE_ROLL.radius).toBeLessThan(0.056);
  const up = new Vector3(0, 1, 0);
  for (const t of [TAPING.at - 1, TAPING.done + 1]) {
    const roll = tapeRollSolid(t);
    expect(Math.abs(roll.center.y - extent(roll, up) - chestTop)).toBeLessThan(
      0.003,
    );
    const [x0, x1] = span(CHEST.center[0], CHEST.size[0]);
    const [z0, z1] = span(CHEST.center[2], CHEST.size[2]);
    expect(roll.center.x - extent(roll, new Vector3(1, 0, 0))).toBeGreaterThan(
      x0,
    );
    expect(roll.center.x + extent(roll, new Vector3(1, 0, 0))).toBeLessThan(x1);
    expect(roll.center.z - extent(roll, new Vector3(0, 0, 1))).toBeGreaterThan(
      z0,
    );
    expect(roll.center.z + extent(roll, new Vector3(0, 0, 1))).toBeLessThan(z1);
    expect(contacts([roll], [parcelBody()])).toEqual([]);
  }
});

test("the strip is laid as he pulls: up one end, along the seam of the lid and down the other end", () => {
  const length = (t: number) =>
    tapeStripAt(t).reduce((sum, piece) => sum + 2 * Math.max(...piece.half), 0);
  expect(length(TAPING.start - 0.01)).toBe(0);
  const full = FOUND_KARTON_SIZE[0] + 2 * PANEL + 2 * TAPE_ROLL.overhang;
  expect(length(TAPING.end)).toBeCloseTo(full, 3);
  expect(length(TAPING_AGAIN.start - 0.01)).toBeCloseTo(full, 3);
  let before = 0;
  for (let t = TAPING.start; t <= TAPING.end; t += 1 / TIMELINE_FPS) {
    const now = length(t);
    expect(now, t.toFixed(2)).toBeGreaterThanOrEqual(before - 1e-9);
    before = now;
  }
  const lid = parcelBody();
  const top = lid.center.y + lid.half[1];
  const seam = lid.axes[2];
  for (const piece of stripPiecesAt(TAPE_STRIPS[0], TAPING.end)) {
    expect(
      Math.abs(piece.center.clone().sub(lid.center).dot(seam)),
    ).toBeLessThan(0.002);
    expect(piece.center.y).toBeLessThan(top + 0.02);
  }
  for (let t = TAPING.start + 0.05; t < TAPING.end; t += 0.1) {
    const roll = tapeRollSolid(t);
    const strip = tapeStripAt(t);
    const reach =
      strip.length === 0
        ? Infinity
        : Math.min(
            ...strip.map((p) =>
              sphereObbGap(
                {
                  kind: "sphere",
                  name: "contact",
                  center: roll.center,
                  radius: TAPE_ROLL.radius + 0.004,
                },
                p,
              ),
            ),
          );
    expect(reach, t.toFixed(2)).toBeLessThan(0.004);
  }
});

test("the tape roll never passes through the parcel", () => {
  const problems: string[] = [];
  for (let t = TAPING.at; t <= TAPING.done; t += 1 / TIMELINE_FPS)
    for (const c of contacts(
      [tapeRollSolid(t)],
      parcelSolids(1, t).filter((s) => !s.name.includes("tape")),
    ))
      if (c.depth > 0.002)
        problems.push(`${t.toFixed(2)} s: roll in ${c.b} by ${mm(c.depth)}`);
  expect(problems.slice(0, 5)).toEqual([]);
});

test(
  "he starts the tape with his left hand and hands the roll to his right over the middle of the lid",
  { timeout: 300_000 },
  () => {
    const first = tapingHoldsOf(TAPE_STRIPS[0]);
    expect(first.map((h) => h.arm).sort()).toEqual([
      "leftArm",
      "rightArm",
    ]);
    expect(handsOff(first).slice(0, 6)).toEqual([]);
  },
);

const [, second] = TAPE_STRIPS;
const piecesLength = (pieces: readonly Obb[]) => pieces.reduce((sum, piece) => sum + 2 * Math.max(...piece.half), 0);

test("the second strip runs along the seam again, over the first and 15 mm towards him, along the lid's length and down both ends by the overhang", () => {
  const lid = parcelBody();
  const again = stripPiecesAt(second, TAPING_AGAIN.end);
  expect(piecesLength(again)).toBeCloseTo(FOUND_KARTON_SIZE[0] + 2 * PANEL + 2 * TAPE_ROLL.overhang, 3);
  for (const piece of again) expect(piece.center.clone().sub(lid.center).dot(lid.axes[2]), piece.name).toBeCloseTo(0.015, 4);
  const firstTop = stripPiecesAt(TAPE_STRIPS[0], TAPING_AGAIN.end).find((p) => p.name === "tape along the lid")!;
  const secondTop = again.find((p) => p.name.startsWith("tape along the lid"))!;
  expect(secondTop.center.y - secondTop.half[1]).toBeGreaterThanOrEqual(firstTop.center.y + firstTop.half[1] - 1e-9);
  expect(secondTop.center.y - secondTop.half[1] - (firstTop.center.y + firstTop.half[1])).toBeLessThan(0.0005);
  const out = (piece: Obb) => piece.center.clone().sub(lid.center).dot(lid.axes[0]);
  const ends = stripPiecesAt(TAPE_STRIPS[0], TAPING_AGAIN.end).filter((p) => !p.name.includes("along the lid"));
  for (const end of again.filter((p) => !p.name.includes("along the lid"))) {
    const under = ends.find((p) => Math.sign(out(p)) === Math.sign(out(end)))!;
    expect(Math.abs(out(end)) - Math.abs(out(under)), end.name).toBeCloseTo(TAPE_ROLL.thickness, 6);
  }
});

test("from TAPING_AGAIN.end on the parcel shows two strips, the carried parcel too", () => {
  expect(stripPiecesAt(second, TAPING_AGAIN.start - 0.01)).toEqual([]);
  expect(tapeStripAt(TAPING_AGAIN.start - 0.01)).toHaveLength(3);
  for (const t of [TAPING_AGAIN.end, TAPING_AGAIN.done + 1, KLINGELSTURM_DURATION - 0.1]) {
    const pieces = tapeStripAt(t);
    expect(pieces, t.toFixed(2)).toHaveLength(6);
    expect(new Set(pieces.map((p) => p.name)).size).toBe(6);
  }
});

test("for the second strip he picks the roll up with his right hand where he put it down, and his left sets it back where it first stood", () => {
  const at = (t: number) => tapeRollSolid(t).center;
  const down = new Vector3(...TAPE_PUT_DOWN.center);
  expect(at(TAPING.done).distanceTo(down)).toBeLessThan(1e-6);
  expect(at(TAPING_AGAIN.at).distanceTo(down)).toBeLessThan(1e-6);
  expect(at(TAPING_AGAIN.done).distanceTo(new Vector3(...TAPE.center))).toBeLessThan(1e-6);
  expect(at(TAPING_AGAIN.start).distanceTo(down)).toBeGreaterThan(0.05);
  const [starts, finishes] = tapingHoldsOf(second);
  expect([starts.arm, finishes.arm]).toEqual(["rightArm", "leftArm"]);
});

test(
  "his hands hold the roll and touch nothing else through the second taping",
  { timeout: 300_000 },
  () => {
    expect(handsOff(tapingHoldsOf(second)).slice(0, 6)).toEqual([]);
    expect(tibikThrough(Math.floor(TAPING_AGAIN.at * TIMELINE_FPS), Math.ceil(TAPING_AGAIN.done * TIMELINE_FPS))).toEqual([]);
    const problems: string[] = [];
    for (let t = TAPING_AGAIN.at; t <= TAPING_AGAIN.done; t += 1 / TIMELINE_FPS)
      for (const c of contacts([tapeRollSolid(t)], [...parcelSolids(1, t).filter((s) => !s.name.includes("tape")), ...FLUR_SOLIDS]))
        if (c.depth > 0.002) problems.push(`${t.toFixed(2)} s: roll in ${c.b} by ${mm(c.depth)}`);
    expect(problems.slice(0, 5)).toEqual([]);
  },
);

test("the second strip screeches as it is pulled, and he leans over the parcel for it", () => {
  const strips = new Map<string, number>();
  for (const c of doorCues().filter((c) => c.sound.includes('tape-pull'))) {
    const strip = c.name.replace(/ (in his Flur|through his door) @.*$/, "");
    strips.set(strip, Math.min(strips.get(strip) ?? Infinity, c.at));
  }
  expect(strips.size).toBe(2);
  expect([...strips.values()][1]).toBeCloseTo(TAPING_AGAIN.start - 0.04, 6);
  expect(shotAt(TAPING_AGAIN.start + 0.5).name).toMatch(/^Flur/);
  expect(tibikAt((TAPING_AGAIN.pick + TAPING_AGAIN.down) / 2).pose.lean).toBeGreaterThan(0.2);
});

test.each(TAPE_STRIPS.map((strip) => [strip.name, strip] as const))(
  "taking the roll over for the strip %s, the hand that takes it comes up round the parcel and onto the roll and holds it on, moving gently all the way, never jumping across to the roll at the grip",
  { timeout: 300_000 },
  (_, strip) => {
    expect(armJumpsOver(framesThrough(strip.times.handover - 0.3, strip.times.done), tibikIn(solveKlingelsturm), [], GENTLE_ARM)).toEqual([]);
  },
);

test("folding the four flaps down, his hands go from flap to flap and fold each over without an arm jumping", { timeout: 300_000 }, () => {
  const from = Math.min(...PACKING_HOLDS.map((h) => h.reach));
  const to = Math.max(...PACKING_HOLDS.map((h) => h.done));
  expect(armJumpsOver(framesThrough(from, to), tibikIn(solveKlingelsturm), [], GENTLE_ARM)).toEqual([]);
});

test("opening his door to Karen and pulling it shut on her, his left hand stays on the lever and the arm follows it smoothly, from reaching for it to letting go", { timeout: 300_000 }, () => {
  expect(handsOff([LEVER_HOLD]).slice(0, 6)).toEqual([]);
  expect(armJumpsOver(framesThrough(LEVER_HOLD.reach, LEVER_HOLD.done), tibikIn(solveKlingelsturm), [], GENTLE_ARM)).toEqual([]);
});

test("he leans in to reach the lever of the shut door, straightens as it swings in towards him and stands upright while it stands ajar", () => {
  expect(tibikAt(LEVER_HOLD.reach - 0.05).pose.lean).toBe(0);
  expect(tibikAt(UNLATCH[0]).pose.lean).toBeCloseTo(LEAN_TO_THE_LEVER, 6);
  expect(tibikAt(OPEN[1]).pose.lean).toBeCloseTo(0, 6);
  expect(tibikAt((OPEN[1] + SHUT[0]) / 2).pose.lean).toBe(0);
  expect(tibikAt(SHUT[1]).pose.lean).toBeCloseTo(LEAN_TO_THE_LEVER, 6);
  expect(tibikAt(LEVER_HOLD.done).pose.lean).toBeCloseTo(0, 6);
  const leans = framesThrough(LEVER_HOLD.reach, LEVER_HOLD.done).map((t) => tibikAt(t).pose.lean);
  expect(Math.max(...leans.slice(1).map((l, i) => Math.abs(l - leans[i])))).toBeLessThan(0.08);
});

test("having folded the right end flap his right hand stays on it until it takes the near long flap, so it goes straight from one to the other", () => {
  const [rightEnd, near] = ["the right end flap", "the near long flap"].map((name) => PACKING_HOLDS.find((h) => h.name === name)!);
  expect(near.reach).toBe(rightEnd.release);
  expect(rightEnd.done).toBe(near.grip);
});
