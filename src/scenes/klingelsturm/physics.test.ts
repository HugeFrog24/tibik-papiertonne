import { existsSync } from "node:fs";
import { HAUSVERWALTUNG_ON_THE_PHONE } from "../../street/building";
import { Vector3 } from "three";
import { expect, test } from "vitest";
import { TOLERANCE, framesIn, framesThrough, tibikHeadOutOfFrame, castFaces, castHeads, castOutOfTallFrame, dialogueFrames, facesUnderBar, lensProblems, penetrations, seconds, mm, headCroppedPartway, speakerOutOfTallFrame, type Staged } from "../sceneChecks";
import { chunkAt } from "../../dialogue/subtitles";
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
import { TIMELINE_FPS, TIME_JUMPS } from "../../timeline";
import {
  HAUSMUELL_DURATION,
  LINES as HAUSMUELL_LINES,
  karenFootsteps,
  tibikFootsteps,
} from "../hausmuell/choreography";
import { faceInWorld, mouthInWorld, onScreen } from "../../dialogue/screen";
import { FISHEYE, insideLens, lensPoint } from "../../toon/fisheye";
import { FORMATS, aspectOf } from "../../frameRate";
import { RIG } from "../../Tibik/rig";
import { TIBIK_DOOR } from "../../building/stairwell";
import { doorLeaf } from "../../building/doors";
import type { Solid } from "../../physics/collision";
import { AJAR_ANGLE, tibikDoorAt } from "./door";
import { DIALLED, KEYS, POCKET, phoneAt, phoneCues, readingAt } from "./calls";
import { SHOTS, cameraAt, shotAt } from "./cameras";
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
  throughLens,
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
  { length: Math.round(KLINGELSTURM_DURATION * TIMELINE_FPS) },
  (_, f) => f / TIMELINE_FPS,
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
  "clearing the solver forgets every cached frame, its core included, and frames solved afresh in any order give the same result",
  { timeout: 120_000 },
  () => {
    const sample = frames.filter((_, i) => i % 15 === 0);
    const forwards = sample.map((t) => solveKlingelsturm(t));
    solveKlingelsturm.clear();
    const backwards = [...sample]
      .reverse()
      .map((t) => solveKlingelsturm(t))
      .reverse();
    expect(sample.filter((_, i) => backwards[i].karen === forwards[i].karen).map(seconds)).toEqual([]);
    expect(JSON.stringify(backwards)).toEqual(JSON.stringify(forwards));
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
  for (const t of [...karenFootsteps(), ...tibikFootsteps()])
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
    expect(phoneAt(out[0] - 1 / TIMELINE_FPS).inHand).toBe(false);
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

const herFirstWordsToThePolice = () => LINES.find((l) => l.speaker === "karen" && l.from > KEYS[KEYS.length - 1].at)!;

const tapeEnd = () => {
  const tape = LINES.filter(
    (l) =>
      l.speaker === "phone" &&
      l.from >= answer(HAUSVERWALTUNG_ON_THE_PHONE).from &&
      l.to < herFirstWordsToThePolice().from,
  );
  return tape[tape.length - 1].to;
};

test("110 is dialled after the Hausverwaltung's tape and before she speaks to the police", () => {
  expect(DIALLED.map((d) => d.digit).join("")).toBe("110");
  for (const d of DIALLED) {
    expect(d.at).toBeGreaterThan(tapeEnd());
    expect(d.at).toBeLessThan(herFirstWordsToThePolice().from);
  }
});

test("the dispatcher's greeting is cut (a film liberty, for the pace): a short ring after the call key and she is already shouting her complaint", () => {
  const ring = phoneCues().find((c) => c.name === "Ringing: Karen")!;
  const first = herFirstWordsToThePolice();
  expect(first.text).toBe("MEIN NACHBAR HAT EINEN KARTON AUS DEM HAUSMÜLL GENOMMEN!");
  expect(first.from - KEYS[KEYS.length - 1].at).toBeLessThanOrEqual(0.8 + 1e-9);
  expect(ring.at + ring.length!).toBeCloseTo(first.from, 9);
  expect(LINES.some((l) => /Polizei-Notruf|Was ist Ihr Notfall/.test(l.text))).toBe(false);
});

test("the dispatcher asks whether anyone is hurt and has the last word, without threats", () => {
  const police = LINES.filter(
    (l) => l.speaker === "phone" && l.from > herFirstWordsToThePolice().from,
  );
  expect(police.map((l) => l.text)).toEqual([
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

test("each digit sounds its tone, the line rings until someone speaks, the call ends in a click and the busy tone", () => {
  const cues = phoneCues();
  for (const d of DIALLED)
    expect(
      cues.filter((c) => c.sound === `dtmf-${d.digit}` && c.at === d.at),
    ).toHaveLength(1);
  for (const [start, call] of [
    [answer(HAUSVERWALTUNG_ON_THE_PHONE), KEYS[0]],
    [herFirstWordsToThePolice(), KEYS[KEYS.length - 1]],
  ] as const) {
    const ring = cues.find(
      (c) =>
        c.sound === "ringback" && c.at > call.at && c.at < start.from,
    );
    expect(ring, start.text).toBeDefined();
    expect(ring!.at + (ring!.length ?? 5)).toBeLessThanOrEqual(
      start.from + 1e-9,
    );
  }
  const beep = cues.find((c) => c.sound === "beep");
  expect(beep!.at).toBeGreaterThan(tapeEnd());
  expect(beep!.at - tapeEnd(), "the beep follows the tape's last word within a few frames").toBeLessThan(0.2);
  expect(beep!.at).toBeLessThan(LINES.find((l) => l.from > tapeEnd())!.from);
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

test("a voice on the phone speaks only while her phone is out of her pocket", { timeout: 120_000 }, () => {
  const problems: string[] = [];
  for (const line of LINES.filter((l) => l.speaker === "phone"))
    for (let t = line.from; t <= line.to; t += 0.25)
      if (solveKlingelsturm(t).phone === null) problems.push(`${line.name} at ${t.toFixed(2)} s: no phone`);
  expect(problems).toEqual([]);
});

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
  "through the gap you see his mouth while he speaks",
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


const tibikHereAt = (t: number) => {
  const state = solveKlingelsturm(t);
  return state.tibikHere ? state.tibik : null;
};
const LIGHT_OUT = SHOTS.find((s) => s.name === "Wide: the light goes out")!;
const enteringAndLeaving = (format: "wide" | "tall"): readonly Staged[] => {
  const inFrame = framesThrough(LIGHT_OUT.from, LIGHT_OUT.to).filter((t) => {
    const tibik = tibikHereAt(t);
    return tibik !== null && tibikHeadOutOfFrame(tibik, cameraAt(t, format), format).length === 0;
  });
  expect(inFrame.length, format).toBeGreaterThan(0);
  return [[LIGHT_OUT.name, LIGHT_OUT.from, inFrame[0], "tibik"], [LIGHT_OUT.name, inFrame[inFrame.length - 1], LIGHT_OUT.to, "tibik"]];
};

test("no shot loses his head part-way: in every shot his head and eyes are either in frame throughout or out of it throughout, except the staged entrances and exits", { timeout: 300_000 }, () => {
  expect(headCroppedPartway(frames, shotAt, cameraAt, tibikHereAt, enteringAndLeaving("wide"))).toEqual([]);
});

const headsHereAt = (t: number) => {
  const state = solveKlingelsturm(t);
  const heads = castHeads(state);
  return state.tibikHere ? heads : { karen: heads.karen };
};

const TALL_FRAMING = { shotAt, cameraAt, headsAt: headsHereAt, solidsAt: (t: number) => klingelsturmSolids(solveKlingelsturm(t)) };

test("in the tall format whoever speaks keeps their head in frame for the whole line", { timeout: 300_000 }, () => {
  expect(speakerOutOfTallFrame(dialogueFrames(LINES), LINES, TALL_FRAMING)).toEqual([]);
});

test("in the tall format the bar never covers an eye or a mouth", { timeout: 120_000 }, () => {
  const lens = (p: [number, number], t: number) => (shotAt(t).name === "Spyhole" ? throughLens(p, "tall") : p);
  expect(facesUnderBar(dialogueFrames(LINES), (t) => chunkAt(LINES, t, "tall"), (t) => cameraAt(t, "tall"), (t) => castFaces(solveKlingelsturm(t)), "tall", lens)).toEqual([]);
});

test("in the tall format no shot loses his head part-way, except as he steps out of his door and walks off, a little longer in the narrower frame", { timeout: 300_000 }, () => {
  expect(headCroppedPartway(frames, shotAt, (t) => cameraAt(t, "tall"), tibikHereAt, enteringAndLeaving("tall"), "tall")).toEqual([]);
});

test("in the tall format, outside dialogue, whoever the wide frame shows the tall frame shows too", { timeout: 300_000 }, () => {
  expect(castOutOfTallFrame(frames, LINES, { ...TALL_FRAMING, staged: enteringAndLeaving("tall") })).toEqual([]);
});

test(
  "the subtitle bar never covers an eye or the mouth of anyone on screen while it shows",
  { timeout: 120_000 },
  () => {
    const lens = (p: [number, number], t: number) => (shotAt(t).name === "Spyhole" ? throughLens(p) : p);
    expect(facesUnderBar(dialogueFrames(LINES), (t) => chunkAt(LINES, t, "wide"), cameraAt, (t) => castFaces(solveKlingelsturm(t)), "wide", lens)).toEqual([]);
  },
);

test("in 9:16 the spyhole shows what it shows in 16:9: wherever her eyes and mouth are inside the round viewer in 16:9, they are inside it in 9:16 too", { timeout: 120_000 }, () => {
  const spyhole = SHOTS.find((s) => s.name === "Spyhole")!;
  const inViewer = (p: Vector3, t: number, format: "wide" | "tall") => {
    const { width, height } = FORMATS[format];
    const [x, y] = throughLens(onScreen(p, cameraAt(t, format), format), format);
    return insideLens(lensPoint([x / width, 1 - y / height], aspectOf(format), FISHEYE.raise[format]));
  };
  const problems: string[] = [];
  for (const t of framesIn(spyhole.from, spyhole.to))
    for (const p of faceInWorld(KAREN_SKELETON, solveKlingelsturm(t).karen).points)
      if (inViewer(p, t, "wide") && !inViewer(p, t, "tall")) problems.push(`${t.toFixed(2)} s`);
  expect(problems.slice(0, 6)).toEqual([]);
});

test("the spyhole's lens takes in all of the 160-degree viewer's field across the frame's shorter side", () => {
  expect(cameraAt(7, "wide").fov).toBeCloseTo((2 * FISHEYE.halfAngle * 180) / Math.PI, 9);
});

test("a door viewer can't tilt: the spyhole looks straight out of his door, so its field never reaches behind the door's own face", () => {
  const leaf = doorLeaf(TIBIK_DOOR, 0);
  const lens = new Vector3(...cameraAt(7, "wide").position);
  const outward = lens.clone().sub(leaf.center).setY(0).normalize();
  for (const format of ["wide", "tall"] as const) {
    const { position, target } = cameraAt(7, format);
    const axis = new Vector3(...target).sub(new Vector3(...position)).normalize();
    expect(axis.angleTo(outward)).toBeLessThan(1e-6);
  }
});
