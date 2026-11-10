import { expect, test } from "vitest";
import { FORMATS } from "../../frameRate";
import { mouthInWorld, onScreen } from "../../dialogue/screen";
import { type Staged, armJumpsOver, castFaces, castHeads, dialogueFrames, facesUnderBar, speakerOutOfTallFrame, frameLabel, framesFrom, framesOf, GENTLE_ARM, KEEP_OFF_THE_CAST, karenIn, lensProblems, mm, penetrations, headCroppedPartway } from "../sceneChecks";
import { Vector3 } from "three";
import { hairAt } from "../../Karen/hair";
import { asKaren } from "../../Karen/character";
import { ARM_KEYS } from "../../physics/armDescent";
import { armIntoTorso, bodyColliders, wholeBodyOf } from "../../characters/skeleton";
import { KAREN_SKELETON } from "../../Karen/rig";
import { asCharacter } from "../../Tibik/character";
import { RIG } from "../../Tibik/rig";
import { entranceGround } from "../../street/layout";
import { KAREN_SHOE, TIBIK_FOOT, sunkSoles } from "../drawnSoles";
import { TIMELINE_FPS, HAUSMUELL_FROM } from "../../timeline";
import { headToKarton, papiertonnenEnd, sceneSolids } from "../papiertonnen/solve";
import { CAMERA_NEAR, OUTLINE } from "../../toon/primitives";
import { SHOTS, cameraAt } from "./cameras";
import { camerasOf } from "../../toon/shots";
import {
  LINES,
  HAUSMUELL_DURATION,
  KAREN_FOLLOW,
  SHOT_KAREN_YELLS,
  karenAt,
  karenGait,
  tibikGait,
} from "./choreography";
import { DOOR_STEP } from "../../building/stairwell";
import { hausmuellEnd, hausmuellViolations, solveHausmuell } from "./solve";
import { chunkAt } from "../../dialogue/subtitles";

test("Hausmuell starts exactly where Papiertonnen ends", () => {
  const end = papiertonnenEnd();
  const start = solveHausmuell(0);
  expect(start.lids).toEqual(end.lids);
  expect(start.tibik.position).toEqual(end.tibik.position);
  expect(start.tibik.rotationY).toBeCloseTo(end.tibik.rotationY, 6);
  for (const [key, value] of Object.entries(end.tibik.pose)) {
    if (typeof value === "number") {
      expect(start.tibik.pose[key as keyof typeof end.tibik.pose]).toBeCloseTo(
        value,
        4,
      );
    }
  }
  start.karton.position.forEach((v, i) => { expect(v).toBeCloseTo(end.karton!.position[i], 4); },
  );
  expect(start.karton.open).toBeCloseTo(end.karton!.open, 6);
}, 120_000);

test(
  "Hausmuell: nothing passes through anything, in any frame",
  { timeout: 300_000 },
  () => {
    expect(
      penetrations(
        framesOf(HAUSMUELL_DURATION, TIMELINE_FPS),
        (frame) => hausmuellViolations(solveHausmuell(frame / TIMELINE_FPS)),
        frameLabel,
      ),
    ).toEqual([]);
  },
);

test(
  "Hausmuell keeps to one side of the line between Tibik and Karen (180° rule)",
  { timeout: 120_000 },
  () => {
    const side = (frame: number) => {
      const { tibik, karen } = solveHausmuell(frame / TIMELINE_FPS);
      const [tx, , tz] = tibik.position;
      const [kx, , kz] = karen.position;
      const [cx, , cz] = cameraAt(frame / TIMELINE_FPS).position;
      return Math.sign((kx - tx) * (cz - tz) - (kz - tz) * (cx - tx));
    };
    const cut = Math.ceil(SHOT_KAREN_YELLS * TIMELINE_FPS);
    const first = side(cut);
    for (
      let frame = cut;
      frame < HAUSMUELL_DURATION * TIMELINE_FPS;
      frame++
    ) {
      expect(side(frame)).toBe(first);
    }
  },
);

test(
  "whoever speaks is on screen",
  { timeout: 120_000 },
  () => {
    for (const line of LINES) {
      if (line.speaker !== "tibik" && line.speaker !== "karen") continue;
      for (let t = line.from; t <= line.to; t += 0.1) {
        const state = solveHausmuell(t);
        const mouth = line.speaker === "tibik" ? mouthInWorld(RIG, state.tibik) : mouthInWorld(KAREN_SKELETON, state.karen);
        const [x, y] = onScreen(mouth, cameraAt(t));
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(FORMATS.wide.width);
        expect(y).toBeGreaterThan(0);
        expect(y).toBeLessThan(FORMATS.wide.height);
      }
    }
  },
);

test(
  "his chin keeps clear of the box and its flaps, by at least their ink outline",
  { timeout: 300_000 },
  () => {
    const problems: string[] = [];
    for (let frame = 0; frame < HAUSMUELL_DURATION * TIMELINE_FPS; frame++) {
      const { tibik, karton } = solveHausmuell(frame / TIMELINE_FPS);
      const gap = headToKarton(tibik, karton);
      if (gap < OUTLINE) {
        problems.push(`frame ${frame}: head ${mm(gap)} from the box`);
      }
    }
    expect(problems).toEqual([]);
  },
);

test(
  "Karen's hair moves with the breeze but never snaps from one frame to the next",
  { timeout: 120_000 },
  () => {
    let previous: Vector3[] | null = null;
    let largest = 0;
    for (let frame = 0; frame < HAUSMUELL_DURATION * TIMELINE_FPS; frame++) {
      const { karen } = solveHausmuell(frame / TIMELINE_FPS);
      const centers = hairAt(
        HAUSMUELL_FROM + frame / TIMELINE_FPS,
        karen.rotationY,
        karen.pose,
      ).map((piece) => new Vector3(...piece.center));
      if (previous) {
        const before = previous;
        largest = Math.max(
          largest,
          ...centers.map((c, i) => c.distanceTo(before[i])),
        );
      }
      previous = centers;
    }
    expect(largest).toBeGreaterThan(0.0005);
    expect(largest).toBeLessThan(0.006);
  },
);

test("the exchange goes on: who she is, the Weisungsbefugnis, and goodbye", () => {
  expect(LINES.map((line) => line.text)).toEqual(
    expect.arrayContaining([
      "Wer sind Sie überhaupt?",
      "SCHULZ!",
      "ICH WOHNE IHNEN GEGENÜBER!",
      "Haben Sie eine Weisungsbefugnis?",
      "…WIE BITTE?!",
      "Schönen Tag noch, Frau Schulz.",
      "DAS HAT EIN NACHSPIEL!",
    ]),
  );
  expect(HAUSMUELL_DURATION).toBeCloseTo(26.8, 9);
});

test("Tibik is still short of the door step when the scene cuts", () => {
  const [x, , z] = hausmuellEnd().tibik.position;
  const dx = Math.max(DOOR_STEP.x0 - x, 0, x - DOOR_STEP.x1);
  const dz = Math.max(DOOR_STEP.z0 - z, 0, z - DOOR_STEP.z1);
  expect(Math.hypot(dx, dz)).toBeGreaterThan(0.5);
});

test("both walk off on their own feet", () => {
  const stepsAfter = (plan: ReturnType<typeof tibikGait>, t: number) =>
    [...plan.plants.leftLeg, ...plan.plants.rightLeg].some((p) => p.on > t);
  expect(stepsAfter(tibikGait(), 23.5)).toBe(true);
  expect(stepsAfter(karenGait(), KAREN_FOLLOW)).toBe(true);
});

test("setting off after him, Karen's left arm comes off her hip into its walking swing without a snap", { timeout: 300_000 }, () => {
  expect(armJumpsOver(framesFrom(KAREN_FOLLOW - 0.2, 1.4), karenIn(solveHausmuell), [], GENTLE_ARM)).toEqual([]);
});

const KAREN_ARMS = ["leftArm", "rightArm"] as const;
const RESTING_ON_HER_HIPS = 0.002;

test("Karen gestures without passing an arm through her own body: her authored arms stay out of her bust and belly, her hands only resting on her hips", { timeout: 120_000 }, () => {
  const through = framesOf(HAUSMUELL_DURATION, TIMELINE_FPS).flatMap((f) => {
    const karen = asKaren(karenAt(f / TIMELINE_FPS));
    return KAREN_ARMS.flatMap((which) => {
      const depth = armIntoTorso(karen.skeleton, karen.pose, which);
      return depth > RESTING_ON_HER_HIPS ? [`${frameLabel(f)} ${which}: ${mm(depth)}`] : [];
    });
  });
  expect(through).toEqual([]);
});

test("Karen's gestures land when she makes them: her arms never trail her pointing and hands-on-hips poses by more than a small nudge", { timeout: 300_000 }, () => {
  const trailing = framesOf(HAUSMUELL_DURATION, TIMELINE_FPS).flatMap((f) => {
    const [solved, authored] = [solveHausmuell(f / TIMELINE_FPS).karen.pose, karenAt(f / TIMELINE_FPS).pose];
    return KAREN_ARMS.flatMap((which) => {
      const off = Math.max(...ARM_KEYS.map((key) => Math.abs(solved[which][key] - authored[which][key])));
      return off > 0.15 ? [`${frameLabel(f)} ${which}: ${off.toFixed(2)} rad`] : [];
    });
  });
  expect(trailing).toEqual([]);
});

test("the camera never sits in anything and keeps 30 cm off both of them, over-the-shoulder shots included", { timeout: 300_000 }, () => {
  const problems = framesOf(HAUSMUELL_DURATION, TIMELINE_FPS).flatMap((f) => {
    const t = f / TIMELINE_FPS;
    const state = solveHausmuell(t);
    const bodies = [bodyColliders(RIG, asCharacter(state.tibik)), bodyColliders(KAREN_SKELETON, asKaren(state.karen))].flatMap(wholeBodyOf);
    return lensProblems(t, new Vector3(...cameraAt(t).position), CAMERA_NEAR, sceneSolids(state.lids, true), bodies, KEEP_OFF_THE_CAST);
  });
  expect(problems.slice(0, 8)).toEqual([]);
});

test("their drawn soles and shoes, outlines included, never dip into the pavement, the doorstep or the mat: his as he walks off with the box, hers as she runs in, stomps and follows him", { timeout: 300_000 }, () => {
  expect([
    ...sunkSoles(TIBIK_FOOT, (t) => ({ ...solveHausmuell(t).tibik, skeleton: RIG }), 0, HAUSMUELL_DURATION, entranceGround),
    ...sunkSoles(KAREN_SHOE, (t) => ({ ...solveHausmuell(t).karen, skeleton: KAREN_SKELETON }), 0, HAUSMUELL_DURATION, entranceGround),
  ].slice(0, 8)).toEqual([]);
});

test("no shot loses his head part-way: in every shot his head and eyes are either in frame throughout or out of it throughout, except the staged entrances and exits", { timeout: 300_000 }, () => {
  expect(headCroppedPartway(framesOf(HAUSMUELL_DURATION, TIMELINE_FPS).map((f) => f / TIMELINE_FPS), camerasOf(SHOTS).shotAt, cameraAt, (t) => solveHausmuell(t).tibik)).toEqual([]);
});

test(
  "the subtitle bar never covers an eye or the mouth of anyone on screen while it shows",
  { timeout: 120_000 },
  () => {
    expect(facesUnderBar(dialogueFrames(LINES), (t) => chunkAt(LINES, t, "wide"), cameraAt, (t) => castFaces(solveHausmuell(t)), "wide")).toEqual([]);
  },
);

const HAUSMUELL_FRAMES = framesOf(HAUSMUELL_DURATION, TIMELINE_FPS).map((f) => f / TIMELINE_FPS);
const { shotAt: hausmuellShotAt } = camerasOf(SHOTS);
const headsAt = (t: number) => castHeads(solveHausmuell(t));

test("in the tall format whoever speaks keeps their head in frame for the whole line", { timeout: 120_000 }, () => {
  expect(speakerOutOfTallFrame(dialogueFrames(LINES), LINES, { shotAt: hausmuellShotAt, cameraAt, headsAt })).toEqual([]);
});

test("in the tall format the bar never covers an eye or a mouth", { timeout: 120_000 }, () => {
  expect(facesUnderBar(dialogueFrames(LINES), (t) => chunkAt(LINES, t, "tall"), (t) => cameraAt(t, "tall"), (t) => castFaces(solveHausmuell(t)), "tall")).toEqual([]);
});

const WALKS_OFF_IN_TALL: Staged = ["Wide: Schönen Tag noch", 24.55, HAUSMUELL_DURATION, "tibik"];

test("in the tall format no shot loses his head part-way, except as he walks off at the end, out of the narrower frame", { timeout: 300_000 }, () => {
  expect(headCroppedPartway(HAUSMUELL_FRAMES, hausmuellShotAt, (t) => cameraAt(t, "tall"), (t) => solveHausmuell(t).tibik, [WALKS_OFF_IN_TALL], "tall")).toEqual([]);
});

