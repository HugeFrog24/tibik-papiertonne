import { Vector3 } from "three";
import { storyJumpsIn } from "../../toon/shots";
import { FPS } from "../../timeline";
import { expect, test } from "vitest";
import { TOLERANCE, penetrations, seconds, mm, tibikHeadOutOfFrame } from "../sceneChecks";
import { FLIGHTS, stairwellGround } from "../../building/stairwell";
import {
  armColliders,
  footCapsule,
  torsoMatrix,
} from "../../characters/skeleton";
import { asCharacter } from "../../Tibik/character";
import { collide, contacts, sphere } from "../../physics/collision";
import { RIG } from "../../Tibik/rig";
import {
  SHOTS,
  TREPPENHAUS_DURATION,
  cameraAt,
  filmTimeOf,
  storyTime,
} from "./cameras";
import {
  HAUSTUER_SWUNG_AT,
  HOLDS,
  LEVER,
  RAIL_SPAN,
  STORY_END,
  haustuerAt,
  haustuerLeverAt,
  tibikDoorAt,
  footstepStoryTimes,
  tibikAt,
  tibikLeverAt,
  treppenhausTibikGait,
} from "./choreography";
import {
  holdGap,
  railGap,
  solveTreppenhaus,
  treppenhausSolids,
  treppenhausViolations,
} from "./solve";

const storyFrames = Array.from(
  { length: Math.floor(STORY_END * FPS) + 1 },
  (_, f) => f / FPS,
);
const filmFrames = Array.from(
  { length: Math.round(TREPPENHAUS_DURATION * FPS) },
  (_, f) => f / FPS,
);

test(
  "treppenhaus: nothing passes through anything, in any frame",
  { timeout: 300_000 },
  () => {
    expect(
      penetrations(
        storyFrames,
        (t) => treppenhausViolations(solveTreppenhaus(t)),
        seconds,
      ).slice(0, 12),
    ).toEqual([]);
  },
);

test(
  "his hand slides along the handrail on the way down",
  { timeout: 300_000 },
  () => {
    const problems: string[] = [];
    for (let t = RAIL_SPAN[0]; t <= RAIL_SPAN[1]; t += 1 / FPS) {
      const gap = railGap(solveTreppenhaus(t));
      if (Math.abs(gap) > TOLERANCE)
        problems.push(`${t.toFixed(2)} s: hand ${mm(gap, 0)} from the rail`);
    }
    expect(problems.slice(0, 12)).toEqual([]);
  },
);

test(
  "his hand is on the handle or button whenever he works one",
  { timeout: 300_000 },
  () => {
    const problems: string[] = [];
    for (const hold of HOLDS) {
      for (let t = hold.grip; t <= hold.release + 1e-9; t += 1 / FPS) {
        const gap = holdGap(solveTreppenhaus(t), hold, t);
        if (Math.abs(gap) > TOLERANCE)
          problems.push(
            `${t.toFixed(2)} s: ${hold.arm} ${mm(gap, 0)} from ${hold.name}`,
          );
      }
    }
    expect(problems.slice(0, 12)).toEqual([]);
  },
);

test("on the flight, every foot stands on its own tread, mostly on it", () => {
  const eg = FLIGHTS[0];
  const problems: string[] = [];
  const { heel, toe, radius } = footCapsule(RIG, 1);
  for (const leg of ["leftLeg", "rightLeg"] as const) {
    for (const plant of treppenhausTibikGait().plants[leg]) {
      const { x, z } = plant.ankle;
      const onFlight =
        (z - eg.firstRiser) * eg.direction > 0 &&
        (z - eg.firstRiser - eg.direction * (eg.risers - 1) * eg.going) *
          eg.direction <
          0;
      if (!onFlight) continue;
      const tread = stairwellGround(x, z);
      const forward = Math.cos(plant.yaw);
      const heights = Array.from({ length: 21 }, (_, i) =>
        stairwellGround(
          x,
          z +
            forward *
              (heel[2] - radius + ((toe[2] - heel[2] + 2 * radius) * i) / 20),
        ),
      );
      const supported =
        heights.filter((y) => Math.abs(y - tread) < 1e-9).length /
        heights.length;
      if (supported < 0.7)
        problems.push(
          `${leg} at z ${z.toFixed(2)}: only ${(supported * 100).toFixed(0)}% on its tread`,
        );
      if (heights.some((y) => y > tread + 1e-9))
        problems.push(`${leg} at z ${z.toFixed(2)}: heel against the riser`);
    }
  }
  expect(problems).toEqual([]);
});

test("cameras never sit inside or against a wall", { timeout: 300_000 }, () => {
  const problems: string[] = [];
  for (const filmT of filmFrames) {
    const setup = cameraAt(filmT);
    const probe = sphere("camera", new Vector3(...setup.position), 0.05);
    for (const solid of treppenhausSolids(solveTreppenhaus(storyTime(filmT)))) {
      if (collide(probe, solid))
        problems.push(`${filmT.toFixed(2)} s: camera against ${solid.name}`);
    }
  }
  expect(problems.slice(0, 8)).toEqual([]);
});

test(
  "frames solved in any order give the same result",
  { timeout: 300_000 },
  () => {
    const sample = storyFrames.filter((_, i) => i % 15 === 0);
    const forwards = sample.map((t) => solveTreppenhaus(t));
    solveTreppenhaus.clear();
    const backwards = [...sample]
      .reverse()
      .map((t) => solveTreppenhaus(t))
      .reverse();
    expect(JSON.stringify(backwards)).toEqual(JSON.stringify(forwards));
  },
);

test("the film never shows a story moment twice, and plays each shot at normal speed", () => {
  let before = -Infinity;
  for (const filmT of filmFrames) {
    const t = storyTime(filmT);
    expect(t).toBeGreaterThan(before);
    before = t;
  }
  for (const shot of SHOTS) {
    expect(storyTime(shot.to - 1e-6) - storyTime(shot.from)).toBeCloseTo(
      shot.to - 1e-6 - shot.from,
      6,
    );
  }
  expect(storyTime(TREPPENHAUS_DURATION - 1 / FPS)).toBeLessThanOrEqual(
    STORY_END,
  );
});

test("story moments map back to the film time that shows them, skipped ones to nothing", () => {
  for (const filmT of filmFrames) {
    expect(filmTimeOf(storyTime(filmT))).toBeCloseTo(filmT, 9);
  }
  const skipped =
    (SHOTS[2].story + (SHOTS[2].to - SHOTS[2].from) + SHOTS[3].story) / 2;
  expect(filmTimeOf(skipped)).toBeNull();
});

test("across the jump to the Haustür his walk goes on: the first step after the cut follows the last one before it no later than his rhythm on the flight, so that step's echo runs into the next footfall and needs no trimming", () => {
  const [cut] = storyJumpsIn(SHOTS);
  const heard = footstepStoryTimes().map(filmTimeOf).filter((t): t is number => t !== null);
  const before = Math.max(...heard.filter((t) => t < cut));
  const after = Math.min(...heard.filter((t) => t >= cut));
  const onTheFlight = heard.filter((t) => t >= SHOTS[2].from && t < cut);
  const stride = Math.max(...onTheFlight.slice(1).map((t, i) => t - onTheFlight[i]));
  expect(onTheFlight.length).toBeGreaterThan(3);
  expect(after - before).toBeLessThanOrEqual(stride + 1e-9);
});

test("once his pull has run out, the closer lets the Haustür open only while he holds it", () => {
  const holding = (t: number) =>
    HOLDS.some(
      (h) => h.name.startsWith("the Haustür") && t >= h.grip && t <= h.release,
    );
  const problems: string[] = [];
  for (let t = HAUSTUER_SWUNG_AT; t < STORY_END; t += 1 / FPS) {
    const opening = haustuerAt(t + 1 / FPS) - haustuerAt(t);
    if (opening > 1e-9 && !holding(t))
      problems.push(`${t.toFixed(2)} s: opens by itself`);
  }
  expect(problems).toEqual([]);
  expect(
    HOLDS.some((h) => h.name === "the Haustür" && h.release >= STORY_END),
  ).toBe(true);
});

test("doors swing, they never jump", () => {
  const doors: [string, (t: number) => number, number][] = [
    ["his door", tibikDoorAt, STORY_END],
    ["the Haustür", haustuerAt, STORY_END],
  ];
  const problems: string[] = [];
  for (const [name, angleAt, end] of doors) {
    for (let t = 0; t < end; t += 0.001) {
      const step = Math.abs(angleAt(t + 0.001) - angleAt(t));
      if (step > 0.005)
        problems.push(
          `${name} at ${t.toFixed(3)} s: ${(step * 1000).toFixed(1)} mrad in 1 ms`,
        );
    }
  }
  expect(problems.slice(0, 6)).toEqual([]);
});

test.each([
  { hold: "his door lever", lever: tibikLeverAt, door: tibikDoorAt },
  { hold: "the Haustür lever", lever: haustuerLeverAt, door: haustuerAt },
])(
  "$hold turns down and frees the latch before the door moves, then springs back when he lets go",
  ({ hold, lever, door }) => {
    const { grip, release } = HOLDS.find((h) => h.name === hold)!;
    const times = Array.from(
      { length: Math.round(STORY_END * 1000) },
      (_, i) => i / 1000,
    );
    const pressed = times.filter((t) => lever(t) > 0);
    expect(pressed[0]).toBeGreaterThanOrEqual(grip);
    expect(lever(times.find((t) => door(t) > 1e-9)!)).toBe(LEVER.down);
    expect(Math.max(...pressed.map(lever))).toBeLessThanOrEqual(LEVER.down);
    expect(pressed[pressed.length - 1]).toBeLessThanOrEqual(
      release + LEVER.back,
    );
  },
);

test("he presses the light button with a nearly straight arm, twisted no further than a shoulder allows", () => {
  const { grip, release } = HOLDS.find((h) => h.name === "the light button")!;
  const problems: string[] = [];
  for (let t = grip; t <= release; t += 1 / FPS) {
    const arm = solveTreppenhaus(t).tibik.pose.leftArm;
    if (arm.elbow > 1.2 || arm.inward > 1.4 || arm.inward < -0.5)
      problems.push(
        `${t.toFixed(2)} s: elbow ${arm.elbow.toFixed(2)}, twist ${arm.inward.toFixed(2)}`,
      );
  }
  expect(problems.slice(0, 6)).toEqual([]);
});

test("walking down, his free arm hangs: the hand never rises above its elbow", () => {
  const problems: string[] = [];
  for (let t = RAIL_SPAN[0]; t <= RAIL_SPAN[1]; t += 0.1) {
    const c = asCharacter(solveTreppenhaus(t).tibik);
    const s = armColliders(RIG, c, "leftArm");
    const elbow = s[s.findIndex((x) => x.name.includes("forearm"))].center;
    const hand = s[s.length - 1].center;
    if (hand.y > elbow.y)
      problems.push(
        `${t.toFixed(1)} s: left hand ${((hand.y - elbow.y) * 100).toFixed(0)} cm above the elbow`,
      );
  }
  expect(problems.slice(0, 6)).toEqual([]);
});

test("on the handrail his hand leads, ahead of his elbow and shoulder, with the elbow low", () => {
  const problems: string[] = [];
  for (let t = RAIL_SPAN[0]; t <= RAIL_SPAN[1]; t += 0.1) {
    const c = asCharacter(solveTreppenhaus(t).tibik);
    const toTorso = torsoMatrix(RIG, c).invert();
    const s = armColliders(RIG, c, "rightArm");
    const at = (i: number) => s[i].center.clone().applyMatrix4(toTorso);
    const shoulder = at(0);
    const elbow = at(s.findIndex((x) => x.name.includes("forearm")));
    const hand = at(s.length - 1);
    if (elbow.y > shoulder.y + 0.05 || hand.z < Math.max(elbow.z, shoulder.z))
      problems.push(
        `${t.toFixed(1)} s: elbow ${((elbow.y - shoulder.y) * 100).toFixed(0)} cm above the shoulder, hand ${((hand.z - Math.max(elbow.z, shoulder.z)) * 100).toFixed(0)} cm ahead`,
      );
  }
  expect(problems.slice(0, 6)).toEqual([]);
});

test("in 'His door' once he is out on the landing, and in 'The light switch', the top of his head and his eyes are in frame", () => {
  const cut = (t: number) => tibikHeadOutOfFrame(solveTreppenhaus(t).tibik, cameraAt(t)).map((part) => `${seconds(t)}: ${part}`);
  const frames = Array.from({ length: Math.round((5.6 - 2.0) * FPS) }, (_, i) => 2.0 + i / FPS);
  expect(frames.flatMap(cut).slice(0, 6)).toEqual([]);
});

test("walking from the stair foot along the facade to the Haustür, his wall-side right arm is held in: as he plays it, it never reaches into the wall, and it comes in without a jump", () => {
  const solids = treppenhausSolids(solveTreppenhaus(16)).filter((s) => s.name === "facade");
  const into: string[] = [];
  const jumps: string[] = [];
  let before = tibikAt(15.2).pose.rightArm;
  for (let t = 15.2; t <= 17.45; t += 1 / FPS) {
    const authored = asCharacter(tibikAt(t));
    const deepest = Math.max(0, ...contacts(armColliders(RIG, authored, "rightArm"), solids).map((c) => c.depth));
    if (deepest > TOLERANCE) into.push(`${seconds(t)}: ${mm(deepest)} into the facade`);
    const arm = authored.pose.rightArm;
    const step = Math.max(...(["raise", "out", "elbow", "inward"] as const).map((k) => Math.abs(arm[k] - before[k])));
    if (step > 0.25) jumps.push(`${seconds(t)}: ${step.toFixed(2)} rad in one frame`);
    before = arm;
  }
  expect(into.slice(0, 6)).toEqual([]);
  expect(jumps).toEqual([]);
});

test("turning from the light switch to the stairs beside his shut door, he already has his arms in: as he plays it, neither arm brushes his door's knob", () => {
  const knob: string[] = [];
  for (let t = 4.6; t <= 5.45; t += 1 / FPS) {
    const solids = treppenhausSolids(solveTreppenhaus(t)).filter((s) => s.name.includes("knob"));
    const authored = asCharacter(tibikAt(t));
    for (const which of ["leftArm", "rightArm"] as const) {
      const depth = Math.max(0, ...contacts(armColliders(RIG, authored, which), solids).map((c) => c.depth));
      if (depth > 0) knob.push(`${seconds(t)} ${which}: ${mm(depth)} into the knob`);
    }
  }
  expect(knob).toEqual([]);
});
