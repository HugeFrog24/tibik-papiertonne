import { existsSync } from "node:fs";
import { Vector3 } from "three";
import { expect, test } from "vitest";
import { TOLERANCE, lensProblems, penetrations, seconds, mm } from "../sceneChecks";
import { SHOES } from "../../building/doormatShape";
import { firstFloorGround } from "../../building/ground";
import { footAt } from "../../characters/gait";
import { bodyColliders, footColliders } from "../../characters/skeleton";
import { asKaren } from "../../Karen/character";
import {
  duzen,
  karenNotShouting,
  morePhrasesThanOne,
  outOfOrder,
  tooFastToRead,
} from "../../dialogue/rules";
import { KAREN_SKELETON } from "../../Karen/rig";
import { PHONE } from "../../Karen/phoneShape";
import { OUTLINE } from "../../toon/primitives";
import { insideLens, lensPoint } from "../../toon/fisheye";
import { FPS, TIME_JUMPS } from "../../timeline";
import {
  HAUSMUELL_DURATION,
  LINES as HAUSMUELL_LINES,
  karenFootsteps,
  tibikFootsteps,
} from "../hausmuell/choreography";
import { mouthInWorld, onScreen } from "../../dialogue/screen";
import { RIG } from "../../Tibik/rig";
import { TIBIK_DOOR } from "../../building/stairwell";
import type { Solid } from "../../physics/collision";
import { AJAR_ANGLE, tibikDoorAt } from "./door";
import { DIALLED, KEYS, POCKET, phoneAt, phoneCues, readingAt } from "./calls";
import { FRAME, SHOTS, cameraAt, shotAt } from "./cameras";
import { EXIT } from "./exit";
import {
  BELL_HOLDS,
  KLINGELSTURM_DURATION,
  LINES,
  BELL_PRESSES,
  bellLift,
  bellRings,
  karenAt,
  karenStandGait,
  phoneObb,
} from "./choreography";
import {
  bellGap,
  phoneGap,
  phoneViolations,
  buttonCenter,
  handOf,
  klingelsturmSolids,
  klingelsturmViolations,
  solveKlingelsturm,
  tailTo,
  tibikViolations,
} from "./solve";
import { round6 } from "../../characters/scalar";

const blocks = (solid: Solid, from: Vector3, to: Vector3) => {
  if (solid.kind !== "obb") return false;
  const local = (p: Vector3) => {
    const d = p.clone().sub(solid.center);
    return solid.axes.map((axis) => d.dot(axis));
  };
  const a = local(from);
  const b = local(to);
  let enter = 0;
  let leave = 1;
  for (let i = 0; i < 3; i++) {
    const d = b[i] - a[i];
    if (Math.abs(d) < 1e-12) {
      if (Math.abs(a[i]) > solid.half[i]) return false;
      continue;
    }
    const t0 = (-solid.half[i] - a[i]) / d;
    const t1 = (solid.half[i] - a[i]) / d;
    enter = Math.max(enter, Math.min(t0, t1));
    leave = Math.min(leave, Math.max(t0, t1));
  }
  return enter < leave && leave > 0 && enter < 1;
};
const HAND_RADIUS = Math.max(...KAREN_SKELETON.hand.size);
const frames = Array.from(
  { length: Math.round(KLINGELSTURM_DURATION * FPS) },
  (_, f) => f / FPS,
);

test(
  "Klingelsturm: nothing passes through anything, in any frame",
  { timeout: 300_000 },
  () => {
    expect(
      penetrations(
        frames,
        (t) => klingelsturmViolations(solveKlingelsturm(t)),
        seconds,
      ).slice(0, 8),
    ).toEqual([]);
  },
);

test(
  "her hand is on the bell exactly while she presses it",
  { timeout: 300_000 },
  () => {
    const problems: string[] = [];
    for (const t of frames) {
      const gap = bellGap(solveKlingelsturm(t));
      const pressing = BELL_PRESSES.some(
        ([at, until]) => t >= at && t <= until,
      );
      const near = BELL_HOLDS.find((h) => t > h.reach && t < h.done);
      if (pressing && Math.abs(gap) > TOLERANCE)
        problems.push(`${t.toFixed(2)} s: hand ${mm(gap, 0)} from the bell`);
      if (!near && gap < 0.01)
        problems.push(`${t.toFixed(2)} s: hand on the bell outside a press`);
    }
    for (let i = 0; i + 1 < BELL_PRESSES.length; i++) {
      const t = (BELL_PRESSES[i][1] + BELL_PRESSES[i + 1][0]) / 2;
      const gap = bellGap(solveKlingelsturm(t));
      if (gap < bellLift(t) / 2)
        problems.push(
          `${t.toFixed(2)} s: between presses her finger stays on the button (${mm(gap)})`,
        );
    }
    expect(problems.slice(0, 8)).toEqual([]);
  },
);

test(
  "her feet rest on the ground, mats included, and never sink into it",
  { timeout: 120_000 },
  () => {
    const problems: string[] = [];
    for (const t of frames) {
      const karen = { ...solveKlingelsturm(t).karen, skeleton: KAREN_SKELETON };
      for (const side of [1, -1] as const) {
        if (!footAt(karenStandGait(), side, t).plant) continue;
        const spheres = footColliders(KAREN_SKELETON, karen, side);
        const gaps = spheres.map(
          (s) =>
            s.center.y - s.radius - firstFloorGround(s.center.x, s.center.z),
        );
        if (Math.min(...gaps) < -0.001)
          problems.push(
            `${t.toFixed(2)} s: foot ${side} ${mm(-Math.min(...gaps))} into the ground`,
          );
        if (Math.min(...gaps) > 0.012)
          problems.push(
            `${t.toFixed(2)} s: foot ${side} floats ${mm(Math.min(...gaps))}`,
          );
      }
    }
    expect(problems.slice(0, 8)).toEqual([]);
  },
);

test("the bell rings exactly while the button is held", () => {
  expect(bellRings()).toEqual(
    BELL_PRESSES.map(([at, until]) => ({
      at,
      length: round6(until - at),
    })),
  );
});

test("the cut from Hausmuell is a declared time jump into a quiet landing", () => {
  expect(TIME_JUMPS).toContainEqual({ from: "Hausmuell", to: "Klingelsturm" });
  const start = solveKlingelsturm(0);
  expect(start.tibikDoor).toBe(0);
  expect(start.tibikLever).toBe(0);
  expect(SHOES).toHaveLength(2);
});

test(
  "cameras never sit inside or against a wall, or inside Karen; the spyhole camera only in the viewer it looks through",
  { timeout: 120_000 },
  () => {
    const problems: string[] = [];
    for (const t of frames) {
      const setup = cameraAt(t);
      const spyhole = shotAt(t).name === "Spyhole";
      const state = solveKlingelsturm(t);
      const body = bodyColliders(KAREN_SKELETON, asKaren(state.karen));
      const lookingThrough = `${TIBIK_DOOR.name} outer viewer`;
      problems.push(
        ...lensProblems(
          t,
          new Vector3(...setup.position),
          spyhole ? 0.005 : 0.05,
          klingelsturmSolids(state).filter(
            (s) => !(spyhole && s.name === lookingThrough),
          ),
          [...body.torso, ...body.head, ...body.leftArm, ...body.rightArm],
        ),
      );
    }
    expect(problems.slice(0, 8)).toEqual([]);
  },
);

test(
  "frames solved in any order give the same result",
  { timeout: 120_000 },
  () => {
    const sample = frames.filter((_, i) => i % 15 === 0);
    const forwards = sample.map((t) => solveKlingelsturm(t));
    solveKlingelsturm.clear();
    const backwards = [...sample]
      .reverse()
      .map((t) => solveKlingelsturm(t))
      .reverse();
    expect(JSON.stringify(backwards)).toEqual(JSON.stringify(forwards));
  },
);

test(
  "every bubble's tail points at something on screen",
  { timeout: 120_000 },
  () => {
    const problems: string[] = [];
    for (const line of LINES)
      for (let t = line.from; t <= line.to; t += 0.1) {
        const target = tailTo(line, t);
        if (target === null) continue;
        const [x, y] = target;
        const inLens =
          shotAt(t).name !== "Spyhole" ||
          insideLens(
            lensPoint(
              [x / FRAME.width, 1 - y / FRAME.height],
              FRAME.width / FRAME.height,
            ),
          );
        if (!inLens || x < 0 || x > FRAME.width || y < 0 || y > FRAME.height)
          problems.push(
            `${line.name} at ${t.toFixed(1)} s: tail to ${x.toFixed(0)}, ${y.toFixed(0)}`,
          );
      }
    expect(problems).toEqual([]);
  },
);

test("the lines run in order, Karen shouts, everybody says Sie, one phrase per bubble, time to read each", () => {
  expect([
    ...outOfOrder(LINES),
    ...karenNotShouting(LINES),
    ...duzen(LINES),
    ...morePhrasesThanOne(LINES),
    ...tooFastToRead(LINES),
  ]).toEqual([]);
});

test("no Klingelsturm sound starts before the scene, no Hausmuell step runs past its end", () => {
  for (const ring of bellRings()) {
    expect(ring.at).toBeGreaterThanOrEqual(0);
    expect(ring.at + ring.length).toBeLessThanOrEqual(KLINGELSTURM_DURATION);
  }
  for (const t of [...karenFootsteps(FPS), ...tibikFootsteps(FPS)])
    expect(t).toBeLessThan(HAUSMUELL_DURATION);
});

test("the shots cover the scene without gaps", () => {
  expect(SHOTS[0].from).toBe(0);
  for (let i = 1; i < SHOTS.length; i++)
    expect(SHOTS[i].from).toBe(SHOTS[i - 1].to);
  expect(SHOTS[SHOTS.length - 1].to).toBe(KLINGELSTURM_DURATION);
});

test(
  "while she holds the button her hand stays on it and never jumps",
  { timeout: 300_000 },
  () => {
    const problems: string[] = [];
    for (const hold of BELL_HOLDS) {
      let before: Vector3 | null = null;
      for (const t of frames.filter(
        (f) => f >= hold.grip && f <= hold.release,
      )) {
        const state = solveKlingelsturm(t);
        const hand = handOf(state);
        if (before && hand.distanceTo(before) > 0.01)
          problems.push(
            `${t.toFixed(2)} s: hand jumped ${mm(hand.distanceTo(before), 0)}`,
          );
        if (hand.distanceTo(buttonCenter()) - HAND_RADIUS > 0.03)
          problems.push(
            `${t.toFixed(2)} s: hand ${mm(hand.distanceTo(buttonCenter()), 0)} from the button`,
          );
        before = hand;
      }
    }
    expect(problems.slice(0, 8)).toEqual([]);
  },
);

test(
  "the phone appears only when her hand reaches her pocket, and whenever it is out of her pocket her fist's outline meets the phone's",
  { timeout: 300_000 },
  () => {
    const out = frames.filter((t) => phoneAt(t).inHand);
    expect(out.length).toBeGreaterThan(0);
    expect(phoneAt(out[0] - 1 / FPS).inHand).toBe(false);
    const problems: string[] = [];
    for (const t of out) {
      const gap = phoneGap(solveKlingelsturm(t)) - OUTLINE - PHONE.ink;
      if (gap > TOLERANCE)
        problems.push(`${t.toFixed(2)} s: fist outline ${mm(gap, 0)} off the phone's`);
    }
    expect(problems.slice(0, 8)).toEqual([]);
  },
);

test(
  "her phone passes through nothing: not the stairwell, not Karen",
  { timeout: 300_000 },
  () => {
    expect(
      penetrations(
        frames.filter((t) => phoneAt(t).inHand),
        (t) => phoneViolations(solveKlingelsturm(t)),
        seconds,
      ).slice(0, 8),
    ).toEqual([]);
  },
);

const answer = (start: string) => {
  const line = LINES.find(
    (l) => l.speaker === "phone" && l.text.startsWith(start),
  );
  if (!line) throw new Error(`no phone line "${start}"`);
  return line;
};

const tapeEnd = () => {
  const tape = LINES.filter(
    (l) =>
      l.speaker === "phone" &&
      l.from >= answer("Hausverwaltung").from &&
      l.to < answer("Polizei").from,
  );
  return tape[tape.length - 1].to;
};

test("110 is dialled after the Hausverwaltung's tape and before the police answer", () => {
  expect(DIALLED.map((d) => d.digit).join("")).toBe("110");
  for (const d of DIALLED) {
    expect(d.at).toBeGreaterThan(tapeEnd());
    expect(d.at).toBeLessThan(answer("Polizei").from);
  }
});

test("the dispatcher asks what the emergency is and has the last word, without threats", () => {
  const police = LINES.filter(
    (l) => l.speaker === "phone" && l.from > answer("Polizei").from - 1e-9,
  );
  expect(police.map((l) => l.text)).toEqual([
    "Polizei-Notruf.",
    "Was ist Ihr Notfall?",
    "Ist jemand verletzt oder in Gefahr?",
    "Ein Karton ist kein Notfall.",
  ]);
  expect(LINES[LINES.length - 1].text).toBe("Ein Karton ist kein Notfall.");
});

test("the runner comes three times: Tibik, Tibik, then Karen quoting him", () => {
  const umwelt = [...HAUSMUELL_LINES, ...LINES].filter((l) =>
    /umwelt/i.test(l.text),
  );
  expect(umwelt.map((l) => l.speaker)).toEqual(["tibik", "tibik", "karen"]);
});

test("the screen shows the number as she dials it", () => {
  expect(DIALLED.map((d) => phoneAt(d.at + 0.05).screen)).toEqual([
    "1",
    "11",
    "110",
  ]);
  expect(phoneAt(DIALLED[0].at - 0.05).screen).toBe("");
});

test("each digit sounds its tone, the line rings before each answer, the call ends in a click and the busy tone", () => {
  const cues = phoneCues();
  for (const d of DIALLED)
    expect(
      cues.filter((c) => c.sound === `dtmf-${d.digit}` && c.at === d.at),
    ).toHaveLength(1);
  for (const [start, call] of [
    ["Hausverwaltung", KEYS[0]],
    ["Polizei", KEYS[KEYS.length - 1]],
  ] as const) {
    const ring = cues.find(
      (c) =>
        c.sound === "ringback" && c.at > call.at && c.at < answer(start).from,
    );
    expect(ring, start).toBeDefined();
    expect(ring!.at + (ring!.length ?? 5)).toBeLessThanOrEqual(
      answer(start).from + 1e-9,
    );
  }
  const beep = cues.find((c) => c.sound === "beep");
  expect(beep!.at).toBeGreaterThan(tapeEnd());
  const last = LINES[LINES.length - 1];
  const click = cues.find((c) => c.sound === "click");
  const busy = cues.find((c) => c.sound === "busy");
  expect(click!.at).toBeGreaterThan(last.to);
  expect(busy!.at).toBeGreaterThan(click!.at);
  for (const c of cues) {
    expect(c.at).toBeGreaterThanOrEqual(0);
    expect(c.at + (c.length ?? 0)).toBeLessThanOrEqual(KLINGELSTURM_DURATION);
  }
});

test(
  "a voice on the phone points its tail at the phone, inside its outline on screen",
  { timeout: 120_000 },
  () => {
    const problems: string[] = [];
    for (const line of LINES.filter((l) => l.speaker === "phone"))
      for (let t = line.from; t <= line.to; t += 0.25) {
        const state = solveKlingelsturm(t);
        const tail = tailTo(line, t);
        if (state.phone === null || tail === null) {
          problems.push(
            `${line.name} at ${t.toFixed(2)} s: ${state.phone ? "no tail" : "no phone"}`,
          );
          continue;
        }
        const box = phoneObb(state.karen, state.phone);
        const corners = [-1, 1].flatMap((x) =>
          [-1, 1].flatMap((y) =>
            [-1, 1].map((z) =>
              onScreen(
                box.center
                  .clone()
                  .addScaledVector(box.axes[0], x * box.half[0])
                  .addScaledVector(box.axes[1], y * box.half[1])
                  .addScaledVector(box.axes[2], z * box.half[2]),
                cameraAt(t),
              ),
            ),
          ),
        );
        const xs = corners.map(([x]) => x);
        const ys = corners.map(([, y]) => y);
        if (
          tail[0] < Math.min(...xs) ||
          tail[0] > Math.max(...xs) ||
          tail[1] < Math.min(...ys) ||
          tail[1] > Math.max(...ys)
        )
          problems.push(
            `${line.name} at ${t.toFixed(2)} s: tail ${tail.map((v) => v.toFixed(0)).join(", ")} off the phone`,
          );
      }
    expect(problems.slice(0, 8)).toEqual([]);
  },
);

test("she presses every key while she is reading the phone", () => {
  expect(
    KEYS.filter((k) => readingAt(k.at) !== 1).map(
      (k) => `${k.key} at ${k.at} s`,
    ),
  ).toEqual([]);
});

test("every phone sound she makes exists in the stairwell's reverb", () => {
  const missing = phoneCues()
    .map((cue) => `public/sfx/stairwell/phone/${cue.sound}.wav`)
    .filter((file) => !existsSync(file));
  expect(missing).toEqual([]);
});

test("her mouth moves on every line she says, the quiet one too", () => {
  const silent = LINES.filter((l) => l.speaker === "karen")
    .filter((l) => {
      const open = Array.from(
        { length: 12 },
        (_, i) =>
          karenAt(l.from + ((l.to - l.from) * (i + 0.5)) / 12).mouthOpen,
      );
      return Math.max(...open) < 0.4;
    })
    .map((l) => l.name);
  expect(silent).toEqual([]);
});

const tibikLines = () => LINES.filter((l) => l.speaker === "tibik");
const sampled = (from: number, to: number) =>
  Array.from({ length: 9 }, (_, i) => from + ((to - from) * i) / 8);

test("Tibik speaks only from behind his spyhole or through his door, opened partway", () => {
  const problems = tibikLines().flatMap((l) =>
    sampled(l.from, l.to)
      .filter(
        (t) =>
          shotAt(t).name !== "Spyhole" && tibikDoorAt(t) < AJAR_ANGLE - 1e-6,
      )
      .map(
        (t) =>
          `${l.name} at ${t.toFixed(2)} s: door at ${tibikDoorAt(t).toFixed(3)} rad`,
      ),
  );
  expect(problems.slice(0, 6)).toEqual([]);
});

test("while she is ringing and phoning he opens his door only partway, a 12 cm slit seen from the landing, and shuts it before she takes out her phone", () => {
  const gaps = frames
    .filter((t) => t < EXIT.offset)
    .map((t) => TIBIK_DOOR.width * (1 - Math.cos(tibikDoorAt(t))));
  expect(Math.max(...gaps)).toBeLessThanOrEqual(0.12 + 1e-9);
  expect(Math.max(...gaps)).toBeGreaterThan(0.115);
  expect(tibikDoorAt(POCKET[0])).toBe(0);
});

test(
  "through the gap you see his mouth while he speaks, and his bubble's tail points at it",
  { timeout: 120_000 },
  () => {
    const problems: string[] = [];
    for (const l of tibikLines())
      for (const t of sampled(l.from, l.to)) {
        if (shotAt(t).name === "Spyhole") continue;
        const state = solveKlingelsturm(t);
        const mouth = mouthInWorld(RIG, state.tibik);
        const eye = new Vector3(...cameraAt(t).position);
        const blocker = klingelsturmSolids(state).find((solid) =>
          blocks(solid, eye, mouth),
        );
        if (blocker)
          problems.push(
            `${l.name} at ${t.toFixed(2)} s: ${blocker.name} hides his mouth`,
          );
        const tail = tailTo(l, t);
        const [mx, my] = onScreen(mouth, cameraAt(t));
        if (tail === null || Math.hypot(tail[0] - mx, tail[1] - my) > 30)
          problems.push(
            `${l.name} at ${t.toFixed(2)} s: tail not at his mouth`,
          );
      }
    expect(problems.slice(0, 8)).toEqual([]);
  },
);

test(
  "Tibik, behind his door, passes through nothing",
  { timeout: 300_000 },
  () => {
    expect(
      penetrations(
        frames,
        (t) => tibikViolations(solveKlingelsturm(t)),
        seconds,
      ).slice(0, 8),
    ).toEqual([]);
  },
);

test("she glares up at his spyhole and looks down at her phone to dial", () => {
  const glaring = karenAt(7.5).pose;
  expect(glaring.headPitch).toBeLessThan(-0.15);
  expect(glaring.gazePitch).toBeGreaterThan(0);
  const dialling = karenAt(DIALLED[1].at).pose;
  expect(dialling.headPitch).toBeGreaterThanOrEqual(0);
  expect(dialling.gazePitch).toBeLessThan(0);
});
