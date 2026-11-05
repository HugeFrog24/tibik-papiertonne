import { expect, test } from "vitest";
import { frameLabel, framesOf, penetrations, mm } from "../sceneChecks";
import { Vector3 } from "three";
import { hairAt } from "../../Karen/hair";
import { FPS, HAUSMUELL_FROM } from "../../timeline";
import { headToKarton, papiertonnenEnd } from "../papiertonnen/solve";
import { OUTLINE } from "../../toon/primitives";
import { cameraAt } from "./cameras";
import {
  LINES,
  HAUSMUELL_DURATION,
  SHOT_KAREN_YELLS,
  karenGait,
  tibikGait,
} from "./choreography";
import { DOOR_STEP } from "../../building/stairwell";
import { hausmuellEnd, hausmuellViolations, solveHausmuell } from "./solve";
import { FRAME_SIZE, mouthOnScreen } from "./speakers";

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
  start.karton.position.forEach((v, i) =>
    expect(v).toBeCloseTo(end.karton!.position[i], 4),
  );
  expect(start.karton.open).toBeCloseTo(end.karton!.open, 6);
}, 120_000);

test(
  "Hausmuell: nothing passes through anything, in any frame",
  { timeout: 300_000 },
  () => {
    expect(
      penetrations(
        framesOf(HAUSMUELL_DURATION, FPS),
        (frame) => hausmuellViolations(solveHausmuell(frame / FPS)),
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
      const { tibik, karen } = solveHausmuell(frame / FPS);
      const [tx, , tz] = tibik.position;
      const [kx, , kz] = karen.position;
      const [cx, , cz] = cameraAt(frame / FPS).position;
      return Math.sign((kx - tx) * (cz - tz) - (kz - tz) * (cx - tx));
    };
    const cut = Math.ceil(SHOT_KAREN_YELLS * FPS);
    const first = side(cut);
    for (
      let frame = cut;
      frame < HAUSMUELL_DURATION * FPS;
      frame++
    ) {
      expect(side(frame)).toBe(first);
    }
  },
);

test(
  "whoever speaks is on screen, so the bubble's tail can point at them",
  { timeout: 120_000 },
  () => {
    for (const line of LINES) {
      if (line.speaker === "phone") continue;
      for (let t = line.from; t <= line.to; t += 0.1) {
        const [x, y] = mouthOnScreen(t, line.speaker);
        expect(x).toBeGreaterThan(0);
        expect(x).toBeLessThan(FRAME_SIZE.width);
        expect(y).toBeGreaterThan(0);
        expect(y).toBeLessThan(FRAME_SIZE.height);
      }
    }
  },
);

test(
  "his chin keeps clear of the box and its flaps, by at least their ink outline",
  { timeout: 300_000 },
  () => {
    const problems: string[] = [];
    for (let frame = 0; frame < HAUSMUELL_DURATION * FPS; frame++) {
      const { tibik, karton } = solveHausmuell(frame / FPS);
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
    for (let frame = 0; frame < HAUSMUELL_DURATION * FPS; frame++) {
      const { karen } = solveHausmuell(frame / FPS);
      const centers = hairAt(
        HAUSMUELL_FROM + frame / FPS,
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
      "Haben Sie überhaupt eine Weisungsbefugnis?",
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
  expect(stepsAfter(karenGait(), 25.3)).toBe(true);
});
