import { Matrix4, Quaternion, Vector3 } from "three";
import { contacts, obb, sphere, type Obb } from "../../physics/collision";
import { guardLid } from "../../street/restingLids";
import { tonneColliders, tonneLidParts } from "../../street/tonneShape";
import { OUTLINE } from "../../toon/primitives";
import {
  DL,
  ENVELOPE,
  envelopeFlap,
  flapPieces,
  letterPanels,
} from "../../props/letterShape";
import { expect, test } from "vitest";
import { armColliders, bodyColliders, handPosition, handSphere, wholeBodyOf } from "../../characters/skeleton";
import { headSurface } from "../../Tibik/headShape";
import { keyParts } from "../../props/keyRingShape";
import {
  MAILBOX_DOOR,
  mailboxDoorFrame,
  mailboxDoorSolid,
  mailboxInside,
  mailboxLockLocal,
} from "../../street/mailboxDoorShape";
import { BINS, ENTRANCE_LAMP, ENTRANCE_X, MAILBOXES, binByName } from "../../street/layout";
import { DOORSTEP, FACADE_Z } from "../../street/building";
import { HAUSTUER } from "../../street/facade";
import { haustuerAt } from "./home";
import { RUNDSCHREIBEN_CUES } from "./soundCues";
import { entranceGround } from "../../street/layout";
import { characterViolations } from "../../physics/guards";
import { RIG } from "../../Tibik/rig";
import { asCharacter } from "../../Tibik/character";
import { FPS } from "../../timeline";
import { TIBIK_FOOT, sunkSoles } from "../drawnSoles";
import { expectGoesIn, expectKeyTurnsByHand, keysAwayFromFist } from "../entryChecks";
import { ARM_JERK, GENTLE_ARM, KEEP_OFF_THE_CAST, armJumpsOver, castOutOfTallFrame, dialogueFrames, facesUnderBar, framesThrough, lensProblems, penetrations, seconds, speakerOutOfTallFrame, tibikHead, tibikIn, headCroppedPartway } from "../sceneChecks";
import { chunkAt } from "../../dialogue/subtitles";
import { faceInWorld } from "../../dialogue/screen";
import { cameraAt, shotAt } from "./cameras";
import {
  UNDER_THE_DOOR_HOLD,
  BACK_UNDER_THE_DOOR_HOLD,
  OUT_OF_THE_HOUSE,
  AT_MAILBOX,
  rundschreibenTibikAt,
  SIDESTEP,
  tibikGait,
  BOX_OPEN,
  BOX_PULLED_OPEN,
  BOX_SHUT,
  ENVELOPE_OUT,
  FLAP,
  BIN_FLOOR,
  FOLD,
  KEY_IN,
  KLOPPEN,
  LID_THUD,
  LID_UP,
  TO_BIN,
  KEY_INSERT,
  KEY_REGRIP,
  LAMP_SENSOR,
  READ,
  ENTRY,
  RUNDSCHREIBEN_DURATION,
  THANKS,
  UNFOLD,
  envelopeGripAt,
  flapGripAt,
  letterGripAt,
  lidHandleGripAt,
  LINES,
} from "./choreography";
import { rundschreibenSolids, solveRundschreiben } from "./solve";

const frames = Array.from({ length: Math.round(RUNDSCHREIBEN_DURATION * FPS) }, (_, f) => f / FPS);

test("the time jump's start: he has just come out onto the pavement, the Haustür swinging shut behind him, every lid shut, the bins emptied", () => {
  const state = solveRundschreiben(0);
  expect(state.haustuer).toBeGreaterThan(0.8);
  expect(solveRundschreiben(0.5).haustuer).toBeLessThan(state.haustuer);
  expect(state.lids.every((l) => l === 0)).toBe(true);
  expect(state.tibik.position[2]).toBeGreaterThan(FACADE_Z + DOORSTEP.depth + 0.2);
  expect(state.mailboxDoor).toBe(0);
  expect(state.envelope).toBeNull();
  expect(state.letter).toBeNull();
});

test(
  "Tibik passes through nothing, outlines included",
  { timeout: 300_000 },
  () => {
    expect(
      penetrations(
        frames,
        (t) => {
          const state = solveRundschreiben(t);
          return characterViolations(asCharacter(state.tibik), rundschreibenSolids(state));
        },
        seconds,
      ).slice(0, 8),
    ).toEqual([]);
  },
);

test(
  "his drawn soles never dip below the pavement, the step or the mat",
  { timeout: 300_000 },
  () => {
    expect(
      sunkSoles(
        TIBIK_FOOT,
        (t) => ({ ...solveRundschreiben(t).tibik, skeleton: RIG }),
        0,
        RUNDSCHREIBEN_DURATION,
        entranceGround,
      ).slice(0, 6),
    ).toEqual([]);
  },
);

const window = (from: number, to: number) => frames.filter((t) => t >= from && t <= to);
const keyOf = (t: number, name: "mailbox" | "house") => {
  const state = solveRundschreiben(t);
  const key = keyParts().find((k) => k.name === name)!;
  const m = state.keys!;
  const tip = key.tip.clone().applyMatrix4(m);
  const axis = key.blade.axes[0].clone().transformDirection(m);
  return {
    state,
    tip,
    axis,
    bow: key.bow.centre.clone().applyMatrix4(m),
    up: key.blade.axes[1].clone().transformDirection(m),
  };
};
const inLock = (t: number, angle: number) => {
  const { tip, axis } = keyOf(t, "mailbox");
  const hole = keyholeAt(angle);
  const depth = tip.clone().sub(hole).dot(axis);
  const offAxis = tip.clone().sub(hole).addScaledVector(axis, -depth).length();
  return { depth, offAxis };
};
const keyholeAt = (angle: number) =>
  new Vector3(...mailboxLockLocal()).applyMatrix4(mailboxDoorFrame(angle));

test("he carries his keys in his left hand from the start", () => {
  for (const t of window(0, KEY_IN - 0.5)) {
    const { state, bow } = keyOf(t, "mailbox");
    const hand = handPosition(RIG, asCharacter(state.tibik), "leftArm");
    expect(hand.distanceTo(bow), t.toFixed(2)).toBeLessThan(Math.max(...RIG.hand.size));
  }
});

test("the key goes into his mailbox's lock and turns a quarter turn before the door opens", () => {
  for (const t of window(KEY_IN, BOX_OPEN[0])) {
    const { depth, offAxis } = inLock(t, 0);
    expect(offAxis, t.toFixed(2)).toBeLessThan(0.004);
    expect(Math.abs(depth - KEY_INSERT), t.toFixed(2)).toBeLessThan(0.004);
  }
  const before = keyOf(KEY_IN, "mailbox").up;
  const after = keyOf(BOX_OPEN[0], "mailbox").up;
  expect(Math.abs(before.dot(after))).toBeLessThan(0.05);
});

test("the box door swings open on its hinge, pulled by the key in the lock, his left hand on the keys", () => {
  expect(solveRundschreiben(BOX_OPEN[0]).mailboxDoor).toBe(0);
  expect(solveRundschreiben(BOX_OPEN[1]).mailboxDoor).toBeCloseTo(BOX_PULLED_OPEN, 9);
  expect(BOX_PULLED_OPEN).toBeLessThanOrEqual(MAILBOX_DOOR.open);
  expect(BOX_PULLED_OPEN).toBeGreaterThanOrEqual((75 * Math.PI) / 180);
  let last = -1;
  for (const t of window(BOX_OPEN[0], BOX_OPEN[1])) {
    const { state, bow } = keyOf(t, "mailbox");
    expect(state.mailboxDoor).toBeGreaterThanOrEqual(last);
    last = state.mailboxDoor;
    const lock = inLock(t, state.mailboxDoor);
    expect(lock.offAxis, t.toFixed(2)).toBeLessThan(0.004);
    expect(Math.abs(lock.depth - KEY_INSERT), t.toFixed(2)).toBeLessThan(0.004);
    const hand = handPosition(RIG, asCharacter(state.tibik), "leftArm");
    expect(hand.distanceTo(bow), t.toFixed(2)).toBeLessThan(Math.max(...RIG.hand.size) + 0.01);
  }
});

test.each([
  ["from the key to the envelope", BOX_OPEN[1] - 0.1, ENVELOPE_OUT[0] + 0.3, GENTLE_ARM],
  ["from the envelope back to the keys to shut the box", ENVELOPE_OUT[1], BOX_SHUT[0] + 0.3, ARM_JERK],
] as const)("%s his left hand ducks under the open box door, never through it, and his arm never jumps", (_, from, to, jerk) => {
  const span = window(from, to);
  const solved = span.map((t) => ({ t, state: solveRundschreiben(t) }));
  const touching = solved
    .filter(({ state }) => contacts([handSphere(RIG, asCharacter(state.tibik), "leftArm")], [mailboxDoorSolid(state.mailboxDoor)]).length > 0)
    .map(({ t }) => seconds(t));
  expect(touching).toEqual([]);
  expect(armJumpsOver(span, tibikIn(solveRundschreiben), [], jerk)).toEqual([]);
});

const envelopeCorners = (m: Matrix4) =>
  [0, DL[0]].flatMap((x) =>
    [0, DL[1]].flatMap((y) =>
      [0, -ENVELOPE.thickness].map((z) => new Vector3(x, y, z).applyMatrix4(m)),
    ),
  );
const insideBox = (p: Vector3) => {
  const { center, size } = mailboxInside();
  return [p.x, p.y, p.z].every((v, i) => Math.abs(v - center[i]) <= size[i] / 2 + 1e-6);
};
const unitFace = MAILBOXES.center[2] + MAILBOXES.size[2] / 2;
const handOf = (t: number, which: "leftArm" | "rightArm") =>
  handPosition(RIG, asCharacter(solveRundschreiben(t).tibik), which);
const REACH = Math.max(...RIG.hand.size) + 0.012;

test("the envelope lies in his box, comes out through the open door into his left hand, never through the door or the box", () => {
  for (const t of window(BOX_OPEN[0], ENVELOPE_OUT[1])) {
    const state = solveRundschreiben(t);
    expect(state.envelope, t.toFixed(2)).not.toBeNull();
    for (const c of envelopeCorners(state.envelope!.matrix))
      expect(insideBox(c) || c.z > unitFace + 1e-6, `${t.toFixed(2)} corner`).toBe(true);
    const door = mailboxDoorSolid(state.mailboxDoor);
    expect(
      contacts(envelopeCorners(state.envelope!.matrix).map((c) => sphere("corner", c, 0)), [door]),
      t.toFixed(2),
    ).toEqual([]);
  }
  for (const t of window(ENVELOPE_OUT[0] + 0.2, ENVELOPE_OUT[1]))
    expect(handOf(t, "leftArm").distanceTo(envelopeGripAt(t, "leftArm")), t.toFixed(2)).toBeLessThan(0.02);
  for (const c of envelopeCorners(solveRundschreiben(ENVELOPE_OUT[1]).envelope!.matrix))
    expect(c.z).toBeGreaterThan(unitFace);
});

test("his right hand takes the envelope, then his left shuts the box by the key and pulls the key out", () => {
  for (const t of window(ENVELOPE_OUT[1] + 0.15, BOX_SHUT[1] + 0.8))
    expect(handOf(t, "rightArm").distanceTo(envelopeGripAt(t, "rightArm")), t.toFixed(2)).toBeLessThan(0.02);
  expect(solveRundschreiben(BOX_SHUT[1]).mailboxDoor).toBe(0);
  for (const t of window(BOX_SHUT[0] + 0.15, BOX_SHUT[1])) {
    const lock = inLock(t, solveRundschreiben(t).mailboxDoor);
    expect(lock.offAxis, t.toFixed(2)).toBeLessThan(0.004);
    expect(Math.abs(lock.depth - KEY_INSERT), t.toFixed(2)).toBeLessThan(0.004);
    expect(handOf(t, "leftArm").distanceTo(keyOf(t, "mailbox").bow), t.toFixed(2)).toBeLessThan(REACH);
  }
  const back = BOX_SHUT[1] + 1.2;
  expect(handOf(back, "leftArm").distanceTo(keyOf(back, "mailbox").bow)).toBeLessThan(Math.max(...RIG.hand.size));
});

const letterQuads = (t: number) => {
  const { letter } = solveRundschreiben(t);
  return letterPanels(letter!.fold).map((p) => {
    const m = letter!.matrix.clone().multiply(p.matrix);
    return { m, size: p.size };
  });
};
const handBalls = (t: number) => {
  const c = asCharacter(solveRundschreiben(t).tibik);
  return (["leftArm", "rightArm"] as const).map((w) => handSphere(RIG, c, w));
};

type Outline = readonly (readonly [number, number])[];
const rectangle = (w: number, h: number): Outline => [[0, 0], [w, 0], [w, h], [0, h]];
const inverses = new WeakMap<Matrix4, Matrix4>();
const inverseOf = (m: Matrix4) => {
  let inverse = inverses.get(m);
  if (!inverse) inverses.set(m, (inverse = m.clone().invert()));
  return inverse;
};
const outlineGap = (point: Vector3, m: Matrix4, outline: Outline) => {
  const p = point.clone().applyMatrix4(inverseOf(m));
  const edges = outline.map((a, i) => [a, outline[(i + 1) % outline.length]] as const);
  const sides = edges.map(([a, b]) => (b[0] - a[0]) * (p.y - a[1]) - (b[1] - a[1]) * (p.x - a[0]));
  if (sides.every((s) => s >= 0) || sides.every((s) => s <= 0)) return Math.abs(p.z);
  const across = Math.min(
    ...edges.map(([a, b]) => {
      const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
      const k = Math.min(1, Math.max(0, ((p.x - a[0]) * dx + (p.y - a[1]) * dy) / (dx * dx + dy * dy)));
      return Math.hypot(p.x - a[0] - k * dx, p.y - a[1] - k * dy);
    }),
  );
  return Math.hypot(across, p.z);
};
const sheetsAt = (t: number) => {
  const { envelope, letter } = solveRundschreiben(t);
  const sheets: { name: string; m: Matrix4; outline: Outline }[] = [];
  if (envelope) {
    const back = new Matrix4().makeTranslation(0, 0, -ENVELOPE.thickness / 2);
    sheets.push(
      { name: "envelope", m: envelope.matrix.clone().multiply(back), outline: rectangle(DL[0], DL[1]) },
      { name: "flap", m: envelope.matrix.clone().multiply(envelopeFlap(envelope.flap)), outline: flapPieces().lifted },
      { name: "flap strip glued on", m: envelope.matrix.clone().multiply(envelopeFlap(0)), outline: flapPieces().glued },
    );
  }
  if (letter)
    letterPanels(letter.fold).forEach((p, i) =>
      sheets.push({ name: `letter panel ${i}`, m: letter.matrix.clone().multiply(p.matrix), outline: rectangle(...p.size) }),
    );
  return sheets;
};

test("he lifts the envelope's flap open with his left hand", () => {
  expect(solveRundschreiben(FLAP[0]).envelope!.flap).toBe(0);
  expect(solveRundschreiben(FLAP[1]).envelope!.flap).toBe(1);
  for (const t of window(FLAP[0] + 0.1, FLAP[1]))
    expect(handOf(t, "leftArm").distanceTo(flapGripAt(t)), t.toFixed(2)).toBeLessThan(0.02);
});

test("the letter comes out of the envelope and never passes through it", () => {
  expect(solveRundschreiben(FLAP[1] - 0.05).letter).toBeNull();
  for (const t of window(FLAP[1], FOLD[1] - 0.01)) {
    const { envelope, letter } = solveRundschreiben(t);
    const toEnvelope = envelope!.matrix.clone().invert();
    for (const q of letterQuads(t))
      for (const [x, y] of [[0, 0], [q.size[0], 0], [0, q.size[1]], [q.size[0], q.size[1]]]) {
        const p = new Vector3(x, y, 0).applyMatrix4(q.m).applyMatrix4(toEnvelope);
        const over = p.x >= 0 && p.x <= DL[0] && p.y >= 0 && p.y <= DL[1];
        expect(!over || p.z < -ENVELOPE.thickness || p.z > 0, t.toFixed(2)).toBe(true);
      }
    expect(letter!.fold, t.toFixed(2)).toBeLessThanOrEqual(1);
  }
});

test("the letter unfolds between his hands without passing through them, flat by the time he reads", () => {
  expect(solveRundschreiben(UNFOLD[0]).letter!.fold).toBe(0);
  expect(solveRundschreiben(READ[0]).letter!.fold).toBe(1);
  for (const t of window(UNFOLD[0], READ[0])) {
    const balls = handBalls(t);
    for (const q of letterQuads(t)) {
      const inverse = q.m.clone().invert();
      for (const b of balls) {
        const p = b.center.clone().applyMatrix4(inverse);
        const inside = p.x > 0 && p.x < q.size[0] && p.y > 0 && p.y < q.size[1];
        expect(!inside || Math.abs(p.z) >= b.radius, t.toFixed(2)).toBe(true);
      }
    }
    expect(handOf(t, "leftArm").distanceTo(letterGripAt(t, "leftArm")), t.toFixed(2)).toBeLessThan(0.02);
    expect(handOf(t, "rightArm").distanceTo(letterGripAt(t, "rightArm")), t.toFixed(2)).toBeLessThan(0.02);
  }
});

test("while he reads, the printed side faces him, upright, reading left to right from where he stands", () => {
  for (const t of [READ[0], (READ[0] + READ[1]) / 2]) {
    const state = solveRundschreiben(t);
    const m = state.letter!.matrix;
    const facing = new Vector3(0, 0, 1).transformDirection(m);
    const up = new Vector3(0, 1, 0).transformDirection(m);
    const along = new Vector3(1, 0, 0).transformDirection(m);
    const yaw = state.tibik.rotationY;
    const forward = new Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const right = forward.clone().cross(new Vector3(0, 1, 0));
    expect(facing.dot(forward), t.toFixed(2)).toBeLessThan(-0.9);
    expect(up.y, t.toFixed(2)).toBeGreaterThan(0.9);
    expect(along.dot(right), t.toFixed(2)).toBeGreaterThan(0.9);
  }
});

test("he holds the envelope a little askew, as anyone would, and it shifts slightly in his hands", () => {
  const upOf = (t: number) =>
    new Vector3(0, 1, 0).transformDirection(solveRundschreiben(t).envelope!.matrix);
  const degrees = (a: Vector3, b: Vector3) => (Math.acos(Math.min(1, a.dot(b))) * 180) / Math.PI;
  const vertical = new Vector3(0, 1, 0);
  for (const t of [READ[0], (READ[0] + READ[1]) / 2]) {
    expect(degrees(upOf(t), vertical), t.toFixed(2)).toBeGreaterThan(3);
    expect(degrees(upOf(t), vertical), t.toFixed(2)).toBeLessThan(12);
  }
  const tops = window(READ[0], READ[1]).map(upOf);
  expect(Math.max(...tops.map((top) => degrees(top, tops[0])))).toBeGreaterThan(0.5);
});

test("the envelope is floppy: it bows and flexes while held, flat in the box, and its open flap flops back past upright", () => {
  expect(solveRundschreiben(ENVELOPE_OUT[0]).envelope!.bow).toBe(0);
  const bows = window(ENVELOPE_OUT[1] + 0.5, READ[1] - 1).map((t) => solveRundschreiben(t).envelope!.bow);
  for (const bow of bows) {
    expect(bow).toBeGreaterThan(0.006);
    expect(bow).toBeLessThan(0.016);
  }
  expect(Math.max(...bows) - Math.min(...bows)).toBeGreaterThan(0.003);
  const flap = solveRundschreiben(FLAP[1] + 0.6).envelope!.flap;
  expect(flap).toBeGreaterThan(1.05);
  expect(flap).toBeLessThan(1.25);
  const tip = new Vector3(DL[0] / 2, -ENVELOPE.flapDepth, 0).applyMatrix4(envelopeFlap(flap));
  expect(tip.z).toBeGreaterThan(0);
});

test("held by his right hand alone, the envelope's free end droops, pivoting about his hand", () => {
  const t = (BOX_SHUT[0] + BOX_SHUT[1]) / 2;
  const m = solveRundschreiben(t).envelope!.matrix;
  const held = new Vector3(0, DL[1] / 2, 0).applyMatrix4(m);
  const free = new Vector3(DL[0], DL[1] / 2, 0).applyMatrix4(m);
  const slope = (held.y - free.y) / held.distanceTo(free);
  expect(slope).toBeGreaterThan(Math.sin((10 * Math.PI) / 180));
  expect(handOf(t, "rightArm").distanceTo(envelopeGripAt(t, "rightArm"))).toBeLessThan(0.02);
});

test("his hands hold the envelope, its flap and the letter by their edges, never through them", () => {
  const found: string[] = [];
  for (const t of window(BOX_OPEN[0], RUNDSCHREIBEN_DURATION))
    for (const [i, ball] of handBalls(t).entries())
      for (const sheet of sheetsAt(t)) {
        const gap = outlineGap(ball.center, sheet.m, sheet.outline) - ball.radius;
        if (gap < -0.0005) found.push(`${t.toFixed(2)} ${i ? "right" : "left"} hand in the ${sheet.name} by ${(-gap * 1000).toFixed(1)} mm`);
      }
  expect(found.slice(0, 900)).toEqual([]);
});

test("from the mailbox to the throw, the envelope and the letter keep an ink outline clear of his head and body, so his outline never shows across the paper", { timeout: 300_000 }, () => {
  const found: string[] = [];
  for (const t of window(BOX_OPEN[0], KLOPPEN[0])) {
    const character = asCharacter(solveRundschreiben(t).tibik);
    const head = headSurface(character, 16, 32);
    const torso = bodyColliders(RIG, character).torso;
    for (const sheet of sheetsAt(t)) {
      const headGap = Math.min(...head.map((p) => outlineGap(p, sheet.m, sheet.outline)));
      if (headGap < OUTLINE) found.push(`${t.toFixed(2)} s: the ${sheet.name} ${(headGap * 1000).toFixed(1)} mm from his head`);
      for (const ball of torso) {
        const gap = outlineGap(ball.center, sheet.m, sheet.outline) - ball.radius;
        if (gap < OUTLINE) found.push(`${t.toFixed(2)} s: the ${sheet.name} ${(gap * 1000).toFixed(1)} mm from his ${ball.name}`);
      }
    }
  }
  expect([...new Set(found)].slice(0, 8)).toEqual([]);
});

const wholeScene = frames;

test("he comes out right under the entrance lamp: its sensor has him from the first frame, so it is on from the start and stays on", { timeout: 300_000 }, () => {
  const [lx, , lz] = ENTRANCE_LAMP.center;
  const [x, , z] = solveRundschreiben(0).tibik.position;
  expect(Math.hypot(x - lx, z - lz)).toBeLessThanOrEqual(LAMP_SENSOR.range);
  for (const t of wholeScene) expect(solveRundschreiben(t).lampOn, t.toFixed(2)).toBe(true);
});

test("he holds the letter steady while reading", () => {
  const steps: string[] = [];
  const reading = wholeScene.filter((t) => t >= READ[0] && t <= THANKS[1]);
  for (let i = 1; i < reading.length; i++) {
    const [a, b] = [reading[i - 1], reading[i]].map((t) => solveRundschreiben(t).letter!.matrix);
    const moved = new Vector3().setFromMatrixPosition(a).distanceTo(new Vector3().setFromMatrixPosition(b));
    const qa = new Quaternion().setFromRotationMatrix(a);
    const qb = new Quaternion().setFromRotationMatrix(b);
    const turned = (qa.angleTo(qb) * 180) / Math.PI;
    if (moved > 0.015 || turned > 3) steps.push(`${reading[i].toFixed(2)}: ${(moved * 1000).toFixed(1)} mm, ${turned.toFixed(2)} deg`);
  }
  expect(steps).toEqual([]);
});

test("he folds the letter back, lifts it over the envelope's mouth and slides it in", { timeout: 300_000 }, () => {
  expect(solveRundschreiben(FOLD[0]).letter!.fold).toBe(1);
  let last = 1;
  for (const t of window(FOLD[0], FOLD[1] - 0.05)) {
    const fold = solveRundschreiben(t).letter!.fold;
    expect(fold, t.toFixed(2)).toBeLessThanOrEqual(last);
    last = fold;
  }
  expect(last).toBe(0);
  const inside = (t: number) => {
    const { envelope } = solveRundschreiben(t);
    const toEnvelope = envelope!.matrix.clone().invert();
    return letterQuads(t).every((q) =>
      [[0, 0], [q.size[0], 0], [0, q.size[1]], [q.size[0], q.size[1]]].every(([x, y]) => {
        const p = new Vector3(x, y, 0).applyMatrix4(q.m).applyMatrix4(toEnvelope);
        return p.x >= -1e-6 && p.x <= DL[0] + 1e-6 && p.y >= -1e-6 && p.y <= DL[1] + 1e-6;
      }),
    );
  };
  expect(window(FOLD[0] + 0.8, FOLD[1] - 0.2).some((t) => !inside(t))).toBe(true);
  expect(inside(FOLD[1] - 1 / FPS)).toBe(true);
  expect(solveRundschreiben(FOLD[1]).letter).toBeNull();
  expect(solveRundschreiben(KLOPPEN[0]).envelope).not.toBeNull();
});

test("his left hand keeps the letter until it is in; his right hand keeps the envelope until he kloppt it", { timeout: 300_000 }, () => {
  for (const t of window(READ[0], FOLD[1] - 0.2))
    expect(handOf(t, "leftArm").distanceTo(letterGripAt(t, "leftArm")), t.toFixed(2)).toBeLessThan(0.02);
  for (const t of window(FOLD[0], KLOPPEN[0]))
    expect(handOf(t, "rightArm").distanceTo(envelopeGripAt(t, "rightArm")), t.toFixed(2)).toBeLessThan(0.02);
});

const paperBin = binByName("Papier 1");
const paperBinIndex = BINS.indexOf(paperBin);

test("he walks past the Haustür to Papier 1 and stands at its lid", { timeout: 300_000 }, () => {
  const xs = window(FOLD[1], LID_UP[0]).map((t) => solveRundschreiben(t).tibik.position[0]);
  expect(xs[0]).toBeLessThan(ENTRANCE_X);
  const at = solveRundschreiben(LID_UP[0]).tibik;
  expect(Math.abs(at.position[0] - paperBin.position[0])).toBeLessThan(0.2);
  expect(at.position[2]).toBeGreaterThan(paperBin.position[2] + 0.6);
  expect(Math.abs(at.rotationY - Math.PI)).toBeLessThan(0.05);
});

test("the lid lifts by its grip and drops shut, never trimmed by anything", { timeout: 300_000 }, () => {
  const lidAt = (t: number) => solveRundschreiben(t).lids[paperBinIndex];
  expect(lidAt(LID_UP[0] - 0.1)).toBe(0);
  expect(Math.max(...window(LID_UP[0], KLOPPEN[1]).map(lidAt))).toBeGreaterThan(0.25);
  for (const t of window(LID_THUD, RUNDSCHREIBEN_DURATION)) expect(lidAt(t), t.toFixed(2)).toBe(0);
  for (const t of frames) {
    const lid = lidAt(t);
    expect(guardLid(paperBin, lid), t.toFixed(2)).toBe(lid);
  }
  for (const t of window(LID_UP[0] + 0.1, KLOPPEN[1]))
    expect(handOf(t, "leftArm").distanceTo(lidHandleGripAt(t)), t.toFixed(2)).toBeLessThan(0.02);
});

const insideTheBin = (p: Vector3) =>
  tonneColliders(paperBin.name, paperBin.position, 0)
    .filter((s) => s.name.endsWith(" wall"))
    .every((wall) => {
      const o = wall;
      const axis = o.axes.reduce((a, b, i) => (o.half[i] < o.half[o.axes.indexOf(a)] ? b : a));
      const thin = o.half[o.axes.indexOf(axis)];
      const toAxis = new Vector3(paperBin.position[0], o.center.y, paperBin.position[2]).sub(o.center);
      const inward = axis.clone().multiplyScalar(Math.sign(toAxis.dot(axis)));
      return p.clone().sub(o.center).dot(inward) >= thin + OUTLINE;
    });

const grown = (o: Obb, by: number): Obb => ({ ...o, half: [o.half[0] + by, o.half[1] + by, o.half[2] + by] });
const envelopeSheets = (state: ReturnType<typeof solveRundschreiben>) => {
  const m = state.envelope!.matrix;
  return [
    obb("envelope", m, [DL[0], DL[1], ENVELOPE.thickness], [DL[0] / 2, DL[1] / 2, -ENVELOPE.thickness / 2]),
    obb("flap", m.clone().multiply(envelopeFlap(state.envelope!.flap)), [DL[0], ENVELOPE.flapDepth, 0.0002], [DL[0] / 2, -ENVELOPE.flapDepth / 2, 0]),
  ];
};
const IN_THE_BIN = 0.15;

test("he kloppt the envelope through the lid opening into the empty bin, where it lies on the floor under the shut lid", { timeout: 300_000 }, () => {
  const bin = (lid: number) => [
    ...tonneColliders(paperBin.name, paperBin.position, 0)
      .filter((s) => !/ lid| bottom/.test(s.name))
      .map((o) => grown(o, OUTLINE)),
    ...tonneLidParts(paperBin.name, paperBin.position, lid, OUTLINE),
  ];
  for (const t of window(KLOPPEN[0], LID_THUD)) {
    const state = solveRundschreiben(t);
    expect(contacts(envelopeSheets(state), bin(state.lids[paperBinIndex])), t.toFixed(2)).toEqual([]);
    if (t >= KLOPPEN[0] + IN_THE_BIN)
      for (const c of envelopeCorners(state.envelope!.matrix))
        expect(insideTheBin(c), `${t.toFixed(2)} corner ${c.toArray().map((v) => v.toFixed(3)).join(",")}`).toBe(true);
  }
  for (const t of window(TO_BIN[1], KLOPPEN[0])) {
    const state = solveRundschreiben(t);
    expect(contacts(envelopeSheets(state), bin(state.lids[paperBinIndex])), t.toFixed(2)).toEqual([]);
  }
  for (const t of [LID_THUD, RUNDSCHREIBEN_DURATION - 1 / FPS]) {
    const state = solveRundschreiben(t);
    const corners = envelopeCorners(state.envelope!.matrix);
    const lowest = Math.min(...corners.map((c) => c.y));
    expect(lowest).toBeGreaterThanOrEqual(BIN_FLOOR - 1e-6);
    expect(lowest).toBeLessThan(BIN_FLOOR + 0.003);
    expect(Math.abs(new Vector3(0, 0, 1).transformDirection(state.envelope!.matrix).y)).toBeGreaterThan(0.95);
    expect(state.lids[paperBinIndex]).toBe(0);
  }
});

test("he unlocks the Haustür from outside with his house key and goes in; the closer shuts it behind him", { timeout: 300_000 }, () => {
  expectGoesIn(ENTRY, solveRundschreiben, frames);
});

const LENS = 0.05;

test(
  "in both formats the camera never sits in a solid, keeps 30 cm off Tibik outside the point-of-view inserts and out of his drawn arms inside them, and stays on his left of the line to the facade",
  { timeout: 300_000 },
  () => {
    const problems: string[] = [];
    for (const t of frames) for (const format of ["wide", "tall"] as const) {
      const state = solveRundschreiben(t);
      const lens = new Vector3(...cameraAt(t, format).position);
      const pov = shotAt(t).pov === true;
      const body = bodyColliders(RIG, asCharacter(state.tibik));
      problems.push(
        ...lensProblems(
          t,
          lens,
          LENS,
          rundschreibenSolids(state),
          pov ? [...body.leftArm, ...body.rightArm] : wholeBodyOf(body),
          pov ? LENS : KEEP_OFF_THE_CAST,
        ),
      );
      if (!pov && lens.x >= state.tibik.position[0])
        problems.push(`${t.toFixed(2)} s: camera right of the line from Tibik to the facade`);
    }
    expect(problems.slice(0, 8)).toEqual([]);
  },
);

test("the house key turns back no faster than a hand turns a key", { timeout: 300_000 }, () => {
  expectKeyTurnsByHand(ENTRY, solveRundschreiben, frames);
});

test("his left hand goes straight from one grip to the next, never dropping to his side in between: only while ducking under the open box door does it dip, at most a hand's width below the box", { timeout: 300_000 }, () => {
  const { center, size } = mailboxInside();
  const ducking = (t: number) => [UNDER_THE_DOOR_HOLD, BACK_UNDER_THE_DOOR_HOLD].some((h) => t >= h.reach && t <= h.grip);
  const floorAt = (t: number) => center[1] - size[1] / 2 - (ducking(t) ? 2 * Math.max(...RIG.hand.size) : 0.05);
  const low = window(KEY_IN, FLAP[0])
    .map((t) => ({ t, y: handOf(t, "leftArm").y }))
    .filter(({ t, y }) => y < floorAt(t))
    .map(({ t, y }) => `${t.toFixed(2)} s: hand at ${y.toFixed(3)} m`);
  expect(low.slice(0, 6)).toEqual([]);
});

test("the key he holds stays in his fist, carried or in a lock, except while it hangs in the open box", { timeout: 300_000 }, () => {
  const held = (t: number) => (t > BOX_OPEN[1] && t < BOX_SHUT[0] + 0.1 ? null : t < KEY_REGRIP ? "mailbox" : "house");
  expect(keysAwayFromFist(solveRundschreiben, frames, held).slice(0, 8)).toEqual([]);
});

test("he shuffles aside to read the letter, never hops: one foot is always on the ground", () => {
  const { plants } = tibikGait();
  for (let t = SIDESTEP[0]; t <= SIDESTEP[1] + 0.2; t += 1 / 60) {
    const down = Object.values(plants).some((list) => list.some((p) => p.on <= t + 1e-9 && t <= p.off + 1e-9));
    expect(down, t.toFixed(3)).toBe(true);
  }
});

const THE_DOORWAY = { from: HAUSTUER.hinge[0], to: HAUSTUER.hinge[0] + HAUSTUER.width, clear: 0.5, body: 0.25 };

test("the epilogue opens on the Haustuer swinging shut behind him on its closer: well open at the first frame, latched before he reaches the mailbox, and below 30 degrees whenever he is in front of the doorway", () => {
  expect(haustuerAt(0)).toBeGreaterThan(0.8);
  expect(haustuerAt(OUT_OF_THE_HOUSE.shut)).toBe(0);
  expect(OUT_OF_THE_HOUSE.shut).toBeLessThan(AT_MAILBOX);
  for (let t = 0; t <= AT_MAILBOX; t += 1 / FPS) {
    const [x] = rundschreibenTibikAt(t).position;
    if (x > THE_DOORWAY.from - THE_DOORWAY.body && x < THE_DOORWAY.to) expect(haustuerAt(t), seconds(t)).toBeLessThan(THE_DOORWAY.clear);
  }
});

test("he starts just outside the Haustuer, clear of its swing", () => {
  const [x, , z] = rundschreibenTibikAt(0).position;
  expect(Math.hypot(x - HAUSTUER.hinge[0], z - HAUSTUER.hinge[2])).toBeGreaterThan(HAUSTUER.width + THE_DOORWAY.body);
  expect(Math.hypot(x - (THE_DOORWAY.from + THE_DOORWAY.to) / 2, z - FACADE_Z)).toBeLessThan(1.5);
});

test("the Haustuer's latch catches on the frame it shuts as the epilogue opens", () => {
  const latch = RUNDSCHREIBEN_CUES.find((c) => c.name === "Haustuer latch catches" || c.name === "Haustür latch catches");
  expect(latch?.at).toBeCloseTo(OUT_OF_THE_HOUSE.shut, 6);
});

test("turning in to his box he takes the short way round, never swinging round to face the street", () => {
  for (let t = OUT_OF_THE_HOUSE.walkOff; t <= AT_MAILBOX; t += 1 / FPS)
    expect(Math.cos(rundschreibenTibikAt(t).rotationY), seconds(t)).toBeLessThan(0.5);
});

test("walking to the Papiertonne past the Restmüll and back to the door, his bin-side arm stays in: as he plays it, neither arm ever reaches into a bin, its lid or what sticks out of it", { timeout: 300_000 }, () => {
  const into: string[] = [];
  for (let t = 0; t <= RUNDSCHREIBEN_DURATION; t += 1 / FPS) {
    const bins = rundschreibenSolids(solveRundschreiben(t)).filter((s) => /Papier|Restmüll|Bio/.test(s.name));
    const authored = asCharacter(rundschreibenTibikAt(t));
    for (const which of ["leftArm", "rightArm"] as const) {
      const depth = Math.max(0, ...contacts(armColliders(RIG, authored, which), bins).map((c) => c.depth));
      if (depth > 0.005) into.push(`${seconds(t)} ${which}: ${(depth * 1000).toFixed(0)} mm`);
    }
  }
  expect(into.slice(0, 6)).toEqual([]);
});

test.each([
  ["out to the envelope", UNDER_THE_DOOR_HOLD],
  ["back to the keys", BACK_UNDER_THE_DOOR_HOLD],
] as const)("ducking under the door %s, his hand speeds up and slows down once, like one reach: its top speed at most 1.6 times its mean", (_, hold) => {
  const steps = 120;
  const points = Array.from({ length: steps + 1 }, (_, i) => hold.near!(hold.reach + ((hold.grip - hold.reach) * i) / steps));
  const moves = points.slice(1).map((p, i) => p.distanceTo(points[i]));
  const mean = moves.reduce((a, b) => a + b, 0) / moves.length;
  expect(Math.max(...moves) / mean).toBeLessThanOrEqual(1.6);
});

test("pushing his mailbox door shut by the key his arm goes with it in one gentle sweep, no jerk", { timeout: 300_000 }, () => {
  expect(armJumpsOver(framesThrough(BOX_SHUT[0], BOX_SHUT[1] + 0.1), tibikIn(solveRundschreiben), [], GENTLE_ARM)).toEqual([]);
});


test("no shot loses his head part-way: in every shot his head and eyes are either in frame throughout or out of it throughout, except the staged entrances and exits", { timeout: 300_000 }, () => {
  expect(headCroppedPartway(frames, shotAt, cameraAt, (t) => solveRundschreiben(t).tibik)).toEqual([]);
});

test("in the tall format no shot loses his head part-way, except as he walks out of the coda's frame into the house, behind the closing door, and the camera stays on the door", { timeout: 300_000 }, () => {
  expect(headCroppedPartway(frames, shotAt, (t) => cameraAt(t, "tall"), (t) => solveRundschreiben(t).tibik, [["Coda", ENTRY.inWalk[0], RUNDSCHREIBEN_DURATION]], "tall")).toEqual([]);
});

test("in the tall format, outside his one line, whenever the wide frame shows him the tall frame shows him too", { timeout: 300_000 }, () => {
  expect(castOutOfTallFrame(frames, LINES, { shotAt, cameraAt, headsAt: (t) => tibikHead(solveRundschreiben(t).tibik), solidsAt: (t) => rundschreibenSolids(solveRundschreiben(t)) })).toEqual([]);
});

const TALL_FRAMING = { shotAt, cameraAt, headsAt: (t: number) => tibikHead(solveRundschreiben(t).tibik), solidsAt: (t: number) => rundschreibenSolids(solveRundschreiben(t)) };

test("in the tall format he keeps his head in frame for the whole of his line", () => {
  expect(speakerOutOfTallFrame(dialogueFrames(LINES), LINES, TALL_FRAMING)).toEqual([]);
});

test.each(["wide", "tall"] as const)("%s: the subtitle bar never covers his eyes or mouth while his line shows", (format) => {
  expect(facesUnderBar(dialogueFrames(LINES), (t) => chunkAt(LINES, t, format), (t) => cameraAt(t, format), (t) => [faceInWorld(RIG, solveRundschreiben(t).tibik)], format)).toEqual([]);
});
