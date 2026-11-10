import { expect, test } from "vitest";
import { wrapAngle } from "../../characters/scalar";
import { castOutOfTallFrame, tibikHead, armJumpsOver, frameLabel, framesFrom, framesOf, framesThrough, KEEP_OFF_THE_CAST, lensProblems, mm, penetrations, secondDifference, tibikHeadOutOfFrame, tibikIn, TOLERANCE, headCroppedPartway } from "../sceneChecks";
import { SHOTS as PAPIERTONNEN_SHOTS, cameraAt as papiertonnenCameraAt } from "./cameras";
import { camerasOf } from "../../toon/shots";
import { contacts, deepest, type Solid } from "../../physics/collision";
import { Vector3 } from "three";
import { armColliders, armIntoTorso, bodyColliders, torsoMatrix, wholeBodyOf } from "../../characters/skeleton";
import { asCharacter } from "../../Tibik/character";
import {
  BINS,
  FOUND_SHEET,
  SEARCHED_BIN,
  STREET_SOLIDS,
  WINDOWS,
  binContentSolids,
  binItemColliders,
  type BinSpec,
} from "../../street/layout";
import {
  tonneColliders,
  tonneLid,
  tonneLidParts,
} from "../../street/tonneShape";
import { ARM_WALK, RIG, TIBIK_REST } from "../../Tibik/rig";
import {
  OPENING,
  PAPIERTONNEN_DURATION,
  SHOT_FOUND_BOX,
  SHOT_INSIDE_BIN,
  kartonAt,
  lidAt,
  papiertonnenHaustuerAt,
  tibikAt,
} from "./choreography";
import { solveTreppenhaus, treppenhausEnd } from "../treppenhaus/solve";
import { storyTime } from "../treppenhaus/cameras";
import { STORY_END } from "../treppenhaus/choreography";
import { TIMELINE_FPS, TREPPENHAUS_FRAMES } from "../../timeline";
import { CAMERA_NEAR, OUTLINE } from "../../toon/primitives";
import {
  binContentViolations,
  guardLid,
  headToKarton,
  OUT_OF_BIN,
  papiertonnenEnd,
  papiertonnenViolations,
  sceneSolids,
  solvePapiertonnen,
} from "./solve";

test(
  "Papiertonnen: nothing passes through anything, in any frame",
  { timeout: 120_000 },
  () => {
    expect(
      penetrations(
        framesOf(PAPIERTONNEN_DURATION, TIMELINE_FPS),
        (frame) => papiertonnenViolations(solvePapiertonnen(frame / TIMELINE_FPS)),
        frameLabel,
      ),
    ).toEqual([]);
  },
);

test(
  "Papiertonnen: bin contents fit inside their bins (lids open or closed)",
  { timeout: 120_000 },
  () => {
    expect(
      penetrations(
        framesOf(PAPIERTONNEN_DURATION, TIMELINE_FPS, 5),
        (frame) => binContentViolations(solvePapiertonnen(frame / TIMELINE_FPS).lids),
        frameLabel,
      ),
    ).toEqual([]);
  },
);

test("the content check catches a sheet poking through a bin wall", () => {
  const bin = BINS[1];
  const clipping: BinSpec = {
    ...bin,
    contents: [
      {
        name: "bad sheet",
        position: [0.02, 1.0, 0.12],
        rotation: [0.28, 0.1, 0],
        size: [0.5, 0.025, 0.5],
        material: "cardboard",
      },
    ],
  };
  const hits = contacts(
    binItemColliders(clipping),
    tonneColliders(bin.name, bin.position, 0.22),
  );
  expect(deepest(hits)).toBeGreaterThan(TOLERANCE);
});

test(
  "Papiertonnen: guards only nudge the performance, they don't rewrite it",
  { timeout: 120_000 },
  () => {
    for (let frame = 0; frame < PAPIERTONNEN_DURATION * TIMELINE_FPS; frame++) {
      const { tibik } = solvePapiertonnen(frame / TIMELINE_FPS);
      expect(
        Math.abs(tibik.position[1] - tibikAt(frame / TIMELINE_FPS).position[1]),
      ).toBeLessThan(0.01);
      expect(tibik.pose.bob).toBeLessThan(0.15);
    }
  },
);

test("the resting pose touches the belly without sinking into it", () => {
  const depth = armIntoTorso(RIG, TIBIK_REST, "leftArm");
  expect(depth).toBeLessThanOrEqual(TOLERANCE);
  expect(depth).toBeGreaterThan(-0.02);
});

test("walking arms swing past the belly without sinking into it", () => {
  for (let swing = -0.45; swing <= 0.45; swing += 0.05) {
    const pose = {
      ...TIBIK_REST,
      leftArm: { ...ARM_WALK, raise: ARM_WALK.raise + swing },
    };
    expect(armIntoTorso(RIG, pose, "leftArm")).toBeLessThanOrEqual(TOLERANCE);
  }
});

test("a lid flipped open under a window stops at the sill instead of passing through it", () => {
  const window = WINDOWS.find((w) => w.y < 3)!;
  const bin = {
    ...BINS.find((b) => b.name === SEARCHED_BIN)!,
    position: [window.x, 0, BINS[0].position[2]] as [number, number, number],
  };
  const fullyOpen = lidAt(PAPIERTONNEN_DURATION);
  const hitsHouse = (angle: number) =>
    deepest(contacts([tonneLid(bin.name, bin.position, angle)], STREET_SOLIDS));
  expect(hitsHouse(fullyOpen)).toBeGreaterThan(TOLERANCE);
  expect(hitsHouse(guardLid(bin, fullyOpen))).toBeLessThanOrEqual(TOLERANCE);
});

test("the box is taken out of the bin on screen, without jumping", () => {
  const worldPosition = (frame: number) => {
    const state = solvePapiertonnen(frame / TIMELINE_FPS);
    const tibik = { ...state.tibik, skeleton: RIG };
    const karton = state.karton!;
    return new Vector3(...karton.position).applyMatrix4(
      torsoMatrix(RIG, tibik),
    );
  };
  const bin = BINS.find((b) => b.name === SEARCHED_BIN)!;
  const lying = bin.contents.find((i) => i.name === FOUND_SHEET)!;
  const inBin = new Vector3(...lying.position).add(
    new Vector3(...bin.position),
  );
  const first = SHOT_FOUND_BOX * TIMELINE_FPS;
  expect(worldPosition(first).distanceTo(inBin)).toBeLessThan(0.002);
  for (let frame = first + 1; frame < PAPIERTONNEN_DURATION * TIMELINE_FPS; frame++) {
    expect(
      worldPosition(frame).distanceTo(worldPosition(frame - 1)),
    ).toBeLessThan(0.1);
  }
}, 120_000);

test("as he pulls the box up out of the bin it tips and slides out over the rim in one motion, never hopping in his hands", { timeout: 120_000 }, () => {
  const inHisHands = (frame: number) => new Vector3(...solvePapiertonnen(frame / TIMELINE_FPS).karton!.position);
  const hops: string[] = [];
  for (let frame = Math.round(SHOT_FOUND_BOX * TIMELINE_FPS) + 1; kartonAt((frame + 1) / TIMELINE_FPS).pickup < OUT_OF_BIN; frame++) {
    const jerk = secondDifference(inHisHands(frame - 1), inHisHands(frame), inHisHands(frame + 1));
    if (jerk > 0.04) hops.push(`${(frame / TIMELINE_FPS).toFixed(2)} s: ${mm(jerk)}`);
  }
  expect(hops).toEqual([]);
});

const LIDS_OPEN_AT = 0.01;
const restsOnSomething = (
  bin: (typeof BINS)[number],
  angle: number,
  supports: Solid[],
) => {
  const fallen = angle + (angle < Math.PI / 2 ? -0.03 : 0.03);
  return (
    deepest(contacts(tonneLidParts(bin.name, bin.position, fallen), supports)) >
    0
  );
};

test(
  "open lids never hang in the air: at rest, they lean on something",
  { timeout: 120_000 },
  () => {
    const problems: string[] = [];
    let before = solvePapiertonnen(0);
    for (let frame = 1; frame < PAPIERTONNEN_DURATION * TIMELINE_FPS; frame++) {
      const now = solvePapiertonnen(frame / TIMELINE_FPS);
      const supports = [
        ...STREET_SOLIDS,
        ...binContentSolids(now.karton ? FOUND_SHEET : undefined),
      ];
      BINS.forEach((bin, i) => {
        const angle = now.lids[i];
        const still = Math.abs(angle - before.lids[i]) < 1e-4;
        if (
          angle > LIDS_OPEN_AT &&
          still &&
          !restsOnSomething(bin, angle, supports)
        ) {
          problems.push(
            `frame ${frame}: ${bin.name} lid open at ${((angle * 180) / Math.PI).toFixed(1)}° with nothing holding it`,
          );
        }
      });
      before = now;
    }
    expect(problems).toEqual([]);
  },
);

test("the lid check catches a lid left hanging just short of vertical", () => {
  const bin = BINS.find((b) => b.name === SEARCHED_BIN)!;
  expect(restsOnSomething(bin, 1.55, [...STREET_SOLIDS])).toBe(false);
  expect(
    restsOnSomething(bin, guardLid(bin, lidAt(PAPIERTONNEN_DURATION)), [
      ...STREET_SOLIDS,
    ]),
  ).toBe(true);
});

test(
  "his chin keeps clear of the box and its flaps, by at least their ink outline",
  { timeout: 120_000 },
  () => {
    const problems: string[] = [];
    for (let frame = 0; frame < PAPIERTONNEN_DURATION * TIMELINE_FPS; frame++) {
      const { tibik, karton } = solvePapiertonnen(frame / TIMELINE_FPS);
      const gap = karton ? headToKarton(tibik, karton) : Infinity;
      if (gap < OUTLINE) {
        problems.push(`frame ${frame}: head ${mm(gap)} from the box`);
      }
    }
    expect(problems).toEqual([]);
  },
);

const toTheMicron = (value: unknown): unknown =>
  typeof value === "number"
    ? Math.round(value * 1e6) / 1e6
    : Array.isArray(value)
      ? value.map(toTheMicron)
      : value && typeof value === "object"
        ? Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, toTheMicron(inner)]))
        : value;

test("papiertonnen ends exactly as before the re-staging, to the micron", () => {
  const { lids, tibik, karton } = papiertonnenEnd();
  expect(
    toTheMicron({
      lids,
      position: tibik.position,
      rotationY: tibik.rotationY,
      pose: tibik.pose,
      karton,
    }),
  ).toMatchSnapshot();
});

const numbersIn = (value: unknown, path = ""): [string, number][] =>
  typeof value === "number"
    ? [[path, value]]
    : value && typeof value === "object"
      ? Object.entries(value).flatMap(([key, inner]) =>
          numbersIn(inner, `${path}.${key}`),
        )
      : [];

test(
  "papiertonnen picks up his walk out of the Haustür where the treppenhaus cuts away: same place, heading and pace, the door and his arms as they were",
  { timeout: 120_000 },
  () => {
    const end = treppenhausEnd();
    const lastStory = storyTime((TREPPENHAUS_FRAMES - 1) / TIMELINE_FPS);
    const lastShown = solveTreppenhaus(lastStory);
    const start = solvePapiertonnen(0);
    const next = solvePapiertonnen(1 / TIMELINE_FPS);
    const pace = (a: readonly number[], b: readonly number[], dt: number) => Math.hypot(b[0] - a[0], b[2] - a[2]) / dt;
    const before = pace(lastShown.tibik.position, end.tibik.position, STORY_END - lastStory);
    const after = pace(start.tibik.position, next.tibik.position, 1 / TIMELINE_FPS);
    expect(before, "still walking as the treppenhaus cuts away").toBeGreaterThan(0.3);
    expect(Math.abs(after - before), "the same pace either side of the cut").toBeLessThan(0.1);
    start.tibik.position.forEach((v, i) => { expect(v, `position ${i}`).toBeCloseTo(end.tibik.position[i], 4); });
    expect(Math.abs(wrapAngle(start.tibik.rotationY - end.tibik.rotationY))).toBeLessThan(1e-4);
    const arms = (pose: object) => numbersIn(pose).filter(([key]) => key.includes("Arm"));
    const was = new Map(arms(end.tibik.pose));
    const moved = arms(start.tibik.pose)
      .filter(([key, v]) => !was.has(key) || Math.abs(v - was.get(key)!) > 1e-4)
      .map(([key, v]) => `${key}: ${v.toFixed(5)} vs ${was.get(key)?.toFixed(5)}`);
    expect(moved).toEqual([]);
    expect(papiertonnenHaustuerAt(0)).toBe(end.haustuer);
    expect(start.haustuer).toBe(end.haustuer);
  },
);

test(
  "lids keep their ink outline out of the house wall and its sills, open or shut",
  { timeout: 120_000 },
  () => {
    const problems: string[] = [];
    for (
      let frame = 0;
      frame < Math.round(PAPIERTONNEN_DURATION * TIMELINE_FPS);
      frame += 3
    ) {
      const { lids } = solvePapiertonnen(frame / TIMELINE_FPS);
      BINS.forEach((bin, i) => {
        const depth = deepest(
          contacts(
            tonneLidParts(bin.name, bin.position, lids[i], OUTLINE),
            STREET_SOLIDS,
          ),
        );
        if (depth > 0.001)
          problems.push(
            `frame ${frame}: ${bin.name} lid outline ${mm(depth, 0)} into the house`,
          );
      });
    }
    expect(problems.slice(0, 6)).toEqual([]);
  },
);

test("in 'Side: open the lid' the top of his head and his eyes are in frame", () => {
  const frames = Array.from({ length: Math.round((6.3 - 4.7) * TIMELINE_FPS) }, (_, i) => 4.7 + i / TIMELINE_FPS);
  expect(frames.flatMap((t) => tibikHeadOutOfFrame(solvePapiertonnen(t).tibik, papiertonnenCameraAt(t)).map((part) => `${t.toFixed(2)} s: ${part}`)).slice(0, 6)).toEqual([]);
});

test("walking out along the row of bins to the Papiertonne, he keeps far enough off them that his bin-side left arm has room: as he plays it, it never reaches into a bin, its lid or what sticks out of it", () => {
  const into: string[] = [];
  for (let t = 2.4; t <= 4.4; t += 1 / TIMELINE_FPS) {
    const s = solvePapiertonnen(t);
    const bins = sceneSolids(s.lids, false, s.haustuer, s.indoors).filter((solid) => /Papier|Restmüll|Bio/.test(solid.name));
    const depth = deepest(contacts(armColliders(RIG, asCharacter(tibikAt(t)), "leftArm"), bins));
    if (depth > TOLERANCE) into.push(`${t.toFixed(2)} s: ${(depth * 1000).toFixed(0)} mm`);
  }
  expect(into.slice(0, 6)).toEqual([]);
});

test("he takes hold of the box in the bin before he lifts it: his hands go onto it over a moment, so neither arm jumps as he grips it", { timeout: 300_000 }, () => {
  expect(armJumpsOver(framesFrom(SHOT_FOUND_BOX - 0.6, 0.9), tibikIn(solvePapiertonnen))).toEqual([]);
});

test("he walks out of the Haustür in stride: no pause on the doorstep, already moving at the cut and never standing still until he reaches the bins", () => {
  const stalls: string[] = [];
  for (let f = 1; f <= Math.round(OPENING * TIMELINE_FPS); f++) {
    const [a, b] = [tibikAt((f - 1) / TIMELINE_FPS).position, tibikAt(f / TIMELINE_FPS).position];
    const speed = Math.hypot(b[0] - a[0], b[2] - a[2]) * TIMELINE_FPS;
    if (speed < 0.3) stalls.push(`${(f / TIMELINE_FPS).toFixed(2)} s: ${speed.toFixed(2)} m/s`);
  }
  expect(stalls.slice(0, 4)).toEqual([]);
});

test("walking out, he lets go of the Haustür and his right hand comes away from it smoothly, no snap", { timeout: 120_000 }, () => {
  expect(armJumpsOver(framesFrom(0, 1.2), tibikIn(solvePapiertonnen), [], { turn: 0.3, hand: 0.08 })).toEqual([]);
});

test("from the bin to his chest the box comes up, tips over the rim and settles against him in one motion: no kink in its path and no tilt that flips in a frame", { timeout: 120_000 }, () => {
  const state = (frame: number) => solvePapiertonnen(frame / TIMELINE_FPS).karton!;
  const jerkOf = (at: (frame: number) => Vector3, frame: number) => secondDifference(at(frame - 1), at(frame), at(frame + 1));
  const where = (frame: number) => new Vector3(...state(frame).position);
  const tilt = (frame: number) => new Vector3(...state(frame).rotation);
  const kinks: string[] = [];
  for (let frame = Math.round(SHOT_FOUND_BOX * TIMELINE_FPS) + 1; kartonAt((frame - 1) / TIMELINE_FPS).pickup < 1; frame++) {
    if (jerkOf(where, frame) > 0.04) kinks.push(`${(frame / TIMELINE_FPS).toFixed(2)} s: path ${mm(jerkOf(where, frame))}`);
    if (jerkOf(tilt, frame) > 0.2) kinks.push(`${(frame / TIMELINE_FPS).toFixed(2)} s: tilt ${jerkOf(tilt, frame).toFixed(2)} rad`);
  }
  expect(kinks).toEqual([]);
});

test("the camera never sits in anything and keeps 30 cm off him; looking up from inside the bin, nothing comes nearer the lens than its near plane", { timeout: 300_000 }, () => {
  const problems = framesOf(PAPIERTONNEN_DURATION, TIMELINE_FPS).flatMap((f) => {
    const t = f / TIMELINE_FPS;
    const state = solvePapiertonnen(t);
    const inTheBin = t >= SHOT_INSIDE_BIN && t < SHOT_FOUND_BOX;
    const body = bodyColliders(RIG, asCharacter(state.tibik));
    return lensProblems(
      t,
      new Vector3(...papiertonnenCameraAt(t).position),
      CAMERA_NEAR,
      sceneSolids(state.lids, state.tibik.holdingBox, state.haustuer, state.indoors),
      wholeBodyOf(body),
      inTheBin ? CAMERA_NEAR : KEEP_OFF_THE_CAST,
    );
  });
  expect(problems.slice(0, 8)).toEqual([]);
});

test("in 'Found a box' the top of his head and his eyes stay in frame while he pulls the box out and turns round with it", () => {
  const frames = framesThrough(SHOT_FOUND_BOX, PAPIERTONNEN_DURATION - 1 / TIMELINE_FPS);
  expect(frames.flatMap((t) => tibikHeadOutOfFrame(solvePapiertonnen(t).tibik, papiertonnenCameraAt(t)).map((part) => `${t.toFixed(2)} s: ${part}`)).slice(0, 8)).toEqual([]);
});


test("no shot loses his head part-way: in every shot his head and eyes are either in frame throughout or out of it throughout, except the staged entrances and exits", { timeout: 300_000 }, () => {
  expect(headCroppedPartway(framesOf(PAPIERTONNEN_DURATION, TIMELINE_FPS).map((f) => f / TIMELINE_FPS), camerasOf(PAPIERTONNEN_SHOTS).shotAt, papiertonnenCameraAt, (t) => solvePapiertonnen(t).tibik)).toEqual([]);
});

const PAPIERTONNEN_FRAMES = framesOf(PAPIERTONNEN_DURATION, TIMELINE_FPS).map((f) => f / TIMELINE_FPS);
const papiertonnenShotAt = camerasOf(PAPIERTONNEN_SHOTS).shotAt;

test("in the tall format no shot loses his head part-way", { timeout: 300_000 }, () => {
  expect(headCroppedPartway(PAPIERTONNEN_FRAMES, papiertonnenShotAt, (t) => papiertonnenCameraAt(t, "tall"), (t) => solvePapiertonnen(t).tibik, [], "tall")).toEqual([]);
});

test("in the tall format, in this silent scene, whenever the wide frame shows him the tall frame shows him too", { timeout: 300_000 }, () => {
  expect(
    castOutOfTallFrame(PAPIERTONNEN_FRAMES, [], {
      shotAt: papiertonnenShotAt,
      cameraAt: papiertonnenCameraAt,
      headsAt: (t) => tibikHead(solvePapiertonnen(t).tibik),
      solidsAt: (t) => {
        const state = solvePapiertonnen(t);
        return sceneSolids(state.lids, state.tibik.holdingBox, state.haustuer, state.indoors);
      },
    }),
  ).toEqual([]);
});
