import { Vector3 } from "three";
import { expect, test } from "vitest";
import { BED_RECT, BEDROOM, CORD_SWITCH, PANE, bedroomSolids, cordPath, cordSwitchSolid, curtainPanels } from "../../building/bedroomShape";
import { allColliders, armColliders, bodyColliders, handPosition, handSphere } from "../../characters/skeleton";
import { contacts, sphere, sphereObbGap, type Solid } from "../../physics/collision";
import { OUTLINE } from "../../toon/primitives";
import { blanketProblems } from "../../props/blanketChecks";
import { blanketGrid, blanketSurface } from "../../props/blanketShape";
import { LYING_TILT, SITTING, lyingInBed, sittingUpInBed } from "../../Tibik/bedPoses";
import { FPS } from "../../frameRate";
import { characterViolations } from "../../physics/guards";
import { DOORSTEP, FACADE_Z } from "../../street/building";
import { entranceGround } from "../../street/layout";
import { asCharacter } from "../../Tibik/character";
import { RIG } from "../../Tibik/rig";
import { TIBIK_FOOT, sunkSoles } from "../drawnSoles";
import { DOOR_STAND } from "../enterHouse";
import { expectGoesIn, expectKeyTurnsByHand, keysAwayFromFist } from "../entryChecks";
import { lensProblems, penetrations, seconds } from "../sceneChecks";
import { streetSolids } from "../streetSolids";
import { cameraAt } from "./cameras";
import { BED_SEAT, duskRootAt } from "./choreography";
import { CORNER, CURTAIN_HANDS, CURTAIN_OPENS_TO, PULLING, PUSHING, STAND, blanketLie, curtainGrip } from "./bedroom";
import { solveNachtruhe, type NachtruheState } from "./solve";
import { BLANKET_BACK, CURTAIN_PULL, DRONE, DUSK, ENTRY, EVENING, EYES_OPEN, HOP_DOWN, HOP_UP, LAMP_OFF, LAMP_ON, LIE_DOWN, MORNING, NACHTRUHE_DURATION, PULL_OVER, SIT_UP, SWING_IN, SWING_OUT, WALK_ROUND } from "./timeline";

const dusk = Array.from({ length: Math.round(DUSK[1] * FPS) }, (_, f) => f / FPS);
const frames = Array.from({ length: Math.round(NACHTRUHE_DURATION * FPS) }, (_, f) => f / FPS);
const between = (from: number, to: number) => frames.filter((t) => t >= from && t < to);
const bedroomOf = (state: NachtruheState) => bedroomSolids({ door: state.bedroomDoor, curtain: state.curtains });
const EVENING_FRAMES = [...between(DUSK[1], EVENING[1]), ...between(MORNING[0], MORNING[1])];

test("the dusk continues Klingelsturm's world: he is on the pavement with nothing in his hands but his keys, the Haustür shut", () => {
  const first = solveNachtruhe(0);
  expect(first.haustuer).toBe(0);
  expect(first.tibik.position[2]).toBeGreaterThan(FACADE_Z + DOORSTEP.depth + 0.3);
  for (const t of dusk) expect(solveNachtruhe(t).tibik.holdingBox, t.toFixed(2)).toBe(false);
  expect(keysAwayFromFist(solveNachtruhe, dusk, () => "house").slice(0, 8)).toEqual([]);
});

test("he walks home from the west, already in step on the first frame", () => {
  const [a, b] = [duskRootAt(0), duskRootAt(1 / FPS)];
  expect(Math.hypot(b.x - a.x, b.z - a.z) * FPS).toBeGreaterThan(0.6);
  expect(b.x).toBeGreaterThan(a.x);
  expect(a.x).toBeLessThan(DOOR_STAND.x - 3);
});

const expectClear = (frames: readonly number[], solidsOf: (state: NachtruheState) => readonly Solid[]) =>
  expect(
    penetrations(
      frames,
      (t) => {
        const state = solveNachtruhe(t);
        return characterViolations(asCharacter(state.tibik), solidsOf(state));
      },
      seconds,
    ).slice(0, 8),
  ).toEqual([]);

test("at dusk Tibik passes through nothing, outlines included", { timeout: 300_000 }, () => {
  expectClear(dusk, streetSolids);
});

test("at dusk his drawn soles never dip below the pavement, the step or the mat", { timeout: 300_000 }, () => {
  expect(sunkSoles(TIBIK_FOOT, (t) => ({ ...solveNachtruhe(t).tibik, skeleton: RIG }), 0, DUSK[1], entranceGround).slice(0, 6)).toEqual([]);
});

test("he unlocks the Haustür from outside with his house key and goes in; the closer has shut it before the drone rises", { timeout: 300_000 }, () => {
  expectGoesIn(ENTRY, solveNachtruhe, dusk);
  expectKeyTurnsByHand(ENTRY, solveNachtruhe, dusk);
  expect(ENTRY.doorShut).toBeLessThan(DRONE[0]);
  expect(solveNachtruhe(DRONE[0]).haustuer).toBe(0);
});

test("in the evening Tibik passes through nothing in the bedroom, outlines included", { timeout: 300_000 }, () => {
  expectClear(EVENING_FRAMES, bedroomOf);
});

test("in the bedroom his drawn soles never dip below the floor, walking in at night or round the bed in the morning", { timeout: 300_000 }, () => {
  const on = (t: number) => ({ ...solveNachtruhe(t).tibik, skeleton: RIG });
  expect(sunkSoles(TIBIK_FOOT, on, DUSK[1], HOP_UP[0], () => BEDROOM.floor).slice(0, 6)).toEqual([]);
  expect(sunkSoles(TIBIK_FOOT, on, HOP_DOWN[1] + 0.05, MORNING[1], () => BEDROOM.floor).slice(0, 6)).toEqual([]);
});

test("he comes in through the bedroom door, walks along his side of the bed and hops up onto its edge", () => {
  expect(solveNachtruhe(DUSK[1]).tibik.position[2]).toBeLessThan(BEDROOM.z0 + 0.6);
  for (const t of between(DUSK[1], HOP_UP[0])) expect(solveNachtruhe(t).tibik.position[2], t.toFixed(2)).toBeLessThan(BED_RECT.z0 - 0.3);
  const sat = solveNachtruhe(HOP_UP[1] + 0.2).tibik;
  sat.position.forEach((v, i) => expect(Math.abs(v - BED_SEAT.position[i]), `axis ${i}`).toBeLessThan(0.01));
  expect(sat.rotationY).toBeCloseTo(Math.PI, 3);
  expect(sat.pose.bob).toBeCloseTo(SITTING.bob, 3);
});

test("the doorway camera keeps 30 cm off Tibik and out of every solid while he goes to bed", { timeout: 300_000 }, () => {
  const problems = EVENING_FRAMES.flatMap((t) => {
    const state = solveNachtruhe(t);
    const body = bodyColliders(RIG, asCharacter(state.tibik));
    return lensProblems(t, new Vector3(...cameraAt(t).position), 0.05, bedroomOf(state), [...body.torso, ...body.head, ...body.leftArm, ...body.rightArm, ...body.legs], 0.3);
  });
  expect(problems.slice(0, 8)).toEqual([]);
});

test("the blanket never passes through him or the mattress all evening, outlines included", { timeout: 300_000 }, () => {
  const problems = EVENING_FRAMES.filter((_, i) => i % 2 === 0).flatMap((t) => {
    const state = solveNachtruhe(t);
    return blanketProblems(BED_RECT, allColliders(RIG, asCharacter(state.tibik)), blanketLie(state.blanket)).map((p) => `${t.toFixed(2)} s: ${p}`);
  });
  expect(problems.slice(0, 8)).toEqual([]);
});

const near = (a: readonly number[], b: readonly number[], within: number) => a.every((v, i) => Math.abs(v - b[i]) < within);

test("he swings his legs onto the bed and sits up where he will lie, then lies down with his head on his pillow", () => {
  const up = solveNachtruhe(SWING_IN[1] + 0.05).tibik;
  expect(near(up.position, sittingUpInBed(-1).position, 0.01)).toBe(true);
  expect(up.rotationY).toBeCloseTo(Math.PI / 2, 3);
  expect(up.tilt ?? 0).toBeCloseTo(0, 3);
  const lying = solveNachtruhe(LIE_DOWN[1] + 0.2).tibik;
  const bed = lyingInBed(-1);
  expect(near(lying.position, bed.position, 0.01)).toBe(true);
  expect(lying.tilt ?? 0).toBeCloseTo(LYING_TILT, 3);
  expect(lying.pose.bob).toBeCloseTo(bed.pose.bob, 2);
});

const HOLDING = Math.max(...RIG.hand.size) + 0.012;

const foldMisses = (windows: { readonly right: readonly [number, number]; readonly left: readonly [number, number] }) =>
  (["rightArm", "leftArm"] as const).flatMap((arm) => {
    const [from, to] = windows[arm === "rightArm" ? "right" : "left"];
    return between(from, to + 1e-9).flatMap((t) => {
      const state = solveNachtruhe(t);
      const lie = blanketLie(state.blanket);
      const holding = new Set(armColliders(RIG, asCharacter(state.tibik), arm).map((s) => s.name));
      const body = allColliders(RIG, asCharacter(state.tibik)).filter((s) => !holding.has(s.name));
      const hand = handPosition(RIG, asCharacter(state.tibik), arm);
      const fold = BED_RECT.z0 + lie.aside;
      const miss = hand.distanceTo(new Vector3(hand.x, blanketSurface(BED_RECT, body, lie)(hand.x, fold), fold));
      return miss > HOLDING ? [`${t.toFixed(2)} s: ${arm} ${(miss * 100).toFixed(1)} cm from the fold`] : [];
    });
  });

test("he pulls the turned-back blanket over himself by its fold, his right hand to his middle, then his left to his side", { timeout: 300_000 }, () => {
  expect(foldMisses(PULLING).slice(0, 8)).toEqual([]);
  expect(solveNachtruhe(PULL_OVER[0]).blanket).toBe(0);
  expect(solveNachtruhe(PULL_OVER[1]).blanket).toBe(1);
});

test("in the morning he pushes the blanket back from beneath, left hand then right, until it lies turned back as the evening found it", { timeout: 300_000 }, () => {
  expect(foldMisses(PUSHING).slice(0, 8)).toEqual([]);
  expect(solveNachtruhe(BLANKET_BACK[0]).blanket).toBe(1);
  expect(solveNachtruhe(BLANKET_BACK[1]).blanket).toBe(0);
});

const pressGap = (click: number) => sphereObbGap(handSphere(RIG, asCharacter(solveNachtruhe(click).tibik), "leftArm"), cordSwitchSolid());

test("his fingers are on the cord switch when his lamp clicks off at night and on in the morning", () => {
  const off = Math.ceil(LAMP_OFF * FPS) / FPS;
  expect(solveNachtruhe(off - 1 / FPS).lamps[1]).toBe(true);
  expect(solveNachtruhe(off).lamps[1]).toBe(false);
  const on = Math.ceil(LAMP_ON * FPS) / FPS;
  expect(solveNachtruhe(on - 1 / FPS).lamps[1]).toBe(false);
  expect(solveNachtruhe(on).lamps[1]).toBe(true);
  for (const click of [off, on]) {
    expect(pressGap(click), click.toFixed(2)).toBeLessThan(0.005);
    expect(pressGap(click), click.toFixed(2)).toBeGreaterThan(-0.005);
  }
});

test("his eyes close in the dark and stay shut until he opens them in the morning, where he fell asleep", () => {
  expect(solveNachtruhe(EVENING[1] - 0.1).tibik.pose.blink).toBeCloseTo(1, 3);
  const morning = solveNachtruhe(MORNING[0]).tibik;
  expect(near(morning.position, lyingInBed(-1).position, 0.01)).toBe(true);
  expect(morning.pose.blink).toBeCloseTo(1, 3);
  expect(solveNachtruhe(EYES_OPEN[0] - 0.05).tibik.pose.blink).toBeCloseTo(1, 3);
  expect(solveNachtruhe(EYES_OPEN[1] + 0.05).tibik.pose.blink).toBeLessThan(0.05);
});

test("he sits up, swings his legs out and hops down where he hopped up", () => {
  const up = solveNachtruhe(SIT_UP[1] + 0.05).tibik;
  expect(near(up.position, sittingUpInBed(-1).position, 0.01)).toBe(true);
  expect(up.tilt ?? 0).toBeCloseTo(0, 3);
  const edge = solveNachtruhe(SWING_OUT[1] + 0.05).tibik;
  expect(near(edge.position, BED_SEAT.position, 0.01)).toBe(true);
  expect(edge.rotationY).toBeCloseTo(Math.PI, 3);
  const down = solveNachtruhe(HOP_DOWN[1] + 0.05).tibik;
  expect(near(down.position, [STAND.x, BEDROOM.floor, STAND.z], 0.01)).toBe(true);
  expect(down.pose.bob).toBeLessThan(0.02);
});

test("the cord switch rests on his pillow and its cord runs to the lamp through nothing, him included, outlines included", { timeout: 300_000 }, () => {
  const pillowTop = Math.max(...bedroomSolids({ door: 0, curtain: [0, 0] }).filter((s) => s.name === "pillow").map((s) => (s.kind === "obb" ? s.center.y + s.half[1] : -Infinity)));
  expect(CORD_SWITCH.center[1] - CORD_SWITCH.size[1] / 2).toBeCloseTo(pillowTop, 3);
  const cord = cordPath().map((p, i) => sphere(`cord ${i}`, p, CORD_SWITCH.cord / 2 + OUTLINE / 2));
  const room = bedroomSolids({ door: 1.5, curtain: [0, 0] });
  const intoRoom = contacts(cord, room).filter((c) => c.depth > OUTLINE / 2 + 0.001).map((c) => `${c.a} into ${c.b} by ${(c.depth * 1000).toFixed(1)} mm`);
  expect(intoRoom.slice(0, 6)).toEqual([]);
  const problems = EVENING_FRAMES.filter((_, i) => i % 3 === 0).flatMap((t) => {
    const body = allColliders(RIG, asCharacter(solveNachtruhe(t).tibik)).map((s) => ({ ...s, radius: s.radius + OUTLINE / 2 }));
    return [
      ...contacts(cord, body)
        .filter((c) => !c.b.includes("hand") || c.depth > OUTLINE + 0.001)
        .map((c) => `${t.toFixed(2)} s: ${c.a} into his ${c.b} by ${(c.depth * 1000).toFixed(1)} mm`),
      ...contacts(body, [cordSwitchSolid()]).filter((c) => !c.a.includes("hand")).map((c) => `${t.toFixed(2)} s: his ${c.a} into the switch`),
    ];
  });
  expect(problems.slice(0, 8)).toEqual([]);
});

test("after getting up he walks round the foot of the bed to the corner by the window, the curtain at his right", () => {
  const there = solveNachtruhe(WALK_ROUND[1] + 0.1).tibik;
  expect(near(there.position, [CORNER.x, BEDROOM.floor, CORNER.z], 0.01)).toBe(true);
  expect(Math.sin(there.rotationY)).toBeGreaterThan(0.99);
  for (const t of between(WALK_ROUND[0], WALK_ROUND[1])) {
    const [x, , z] = solveNachtruhe(t).tibik.position;
    expect(x > BED_RECT.x1 || z < BED_RECT.z0 - 0.3, t.toFixed(2)).toBe(true);
  }
});

test("he slides the near curtain panel toward the wall by its fabric until the near half of the window is open, his right hand on it, and the far panel stays drawn", { timeout: 300_000 }, () => {
  const away = (["rightArm"] as const).flatMap((arm) =>
    between(...CURTAIN_HANDS[arm]).flatMap((t) => {
      const gap = sphereObbGap(handSphere(RIG, asCharacter(solveNachtruhe(t).tibik), arm), curtainGrip(t));
      return Math.abs(gap) > 0.005 ? [`${t.toFixed(2)} s: ${arm} ${(gap * 1000).toFixed(1)} mm off the curtain`] : [];
    }),
  );
  expect(away.slice(0, 8)).toEqual([]);
  for (const t of between(MORNING[0], MORNING[1])) expect(solveNachtruhe(t).curtains[0], t.toFixed(2)).toBe(0);
  expect(solveNachtruhe(CURTAIN_PULL[0]).curtains[1]).toBe(0);
  expect(solveNachtruhe(CURTAIN_PULL[1]).curtains[1]).toBe(CURTAIN_OPENS_TO);
  const { x0 } = curtainPanels(solveNachtruhe(CURTAIN_PULL[1]).curtains)[1];
  expect(x0).toBeGreaterThan(PANE.x1);
});

test("the morning hands the epilogue its world: rain, every lid and the Haustür shut", () => {
  const last = solveNachtruhe(NACHTRUHE_DURATION);
  expect(last.rain).toBe(true);
  expect(last.lids.every((l) => l === 0)).toBe(true);
  expect(last.haustuer).toBe(0);
});

test("while he sits up in bed the turned-back fleece lies beside him, never tented up his side", { timeout: 300_000 }, () => {
  const upright = [...between(SWING_IN[0], LIE_DOWN[1]), ...between(SIT_UP[0], SWING_OUT[1])].filter((t) => (solveNachtruhe(t).tibik.tilt ?? 0) < 0.6);
  expect(upright.length).toBeGreaterThan(20);
  const tents = upright.flatMap((t) => {
    const state = solveNachtruhe(t);
    const grid = blanketGrid(BED_RECT, allColliders(RIG, asCharacter(state.tibik)), blanketLie(state.blanket));
    const highest = Math.max(...grid.columns.flatMap((x) => grid.rows.map((z) => grid.height(x, z))));
    return highest - BED_RECT.top > 0.12 ? [`${t.toFixed(2)} s: the fleece ${((highest - BED_RECT.top) * 100).toFixed(0)} cm up`] : [];
  });
  expect(tents.slice(0, 6)).toEqual([]);
});
