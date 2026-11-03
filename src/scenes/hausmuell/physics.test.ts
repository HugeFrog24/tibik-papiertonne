import { expect, test } from "vitest";
import { headToKarton, papiertonnenEnd } from "../papiertonnen/solve";
import { OUTLINE } from "../../toon/primitives";
import { cameraAt } from "./cameras";
import { LINES, HAUSMUELL_DURATION, SHOT_KAREN_YELLS } from "./choreography";
import { hausmuellViolations, solveHausmuell } from "./solve";
import { FRAME_SIZE, mouthOnScreen } from "./speakers";

const FPS = 30;
const TOLERANCE = 0.005;

test("Hausmuell starts exactly where Papiertonnen ends", () => {
  const end = papiertonnenEnd();
  const start = solveHausmuell(0);
  expect(start.lids).toEqual(end.lids);
  expect(start.tibik.position).toEqual(end.tibik.position);
  expect(start.tibik.rotationY).toBeCloseTo(end.tibik.rotationY, 6);
  for (const [key, value] of Object.entries(end.tibik.pose)) {
    if (typeof value === "number") {
      expect(start.tibik.pose[key as keyof typeof end.tibik.pose]).toBeCloseTo(value, 4);
    }
  }
  start.karton.position.forEach((v, i) => expect(v).toBeCloseTo(end.karton!.position[i], 4));
  expect(start.karton.open).toBeCloseTo(end.karton!.open, 6);
}, 120_000);

test("Hausmuell: nothing passes through anything, in any frame", { timeout: 300_000 }, () => {
  const problems: string[] = [];
  for (let frame = 0; frame < HAUSMUELL_DURATION * FPS; frame++) {
    problems.push(
      ...hausmuellViolations(solveHausmuell(frame / FPS))
        .filter((c) => c.depth > TOLERANCE)
        .map((c) => `frame ${frame}: ${c.a} is ${(c.depth * 1000).toFixed(0)} mm inside ${c.b}`),
    );
  }
  expect(problems).toEqual([]);
});

test("Hausmuell keeps to one side of the line between Tibik and Karen (180° rule)", { timeout: 120_000 }, () => {
  const side = (frame: number) => {
    const { tibik, karen } = solveHausmuell(frame / FPS);
    const [tx, , tz] = tibik.position;
    const [kx, , kz] = karen.position;
    const [cx, , cz] = cameraAt(frame / FPS).position;
    return Math.sign((kx - tx) * (cz - tz) - (kz - tz) * (cx - tx));
  };
  const first = side(SHOT_KAREN_YELLS * FPS);
  for (let frame = SHOT_KAREN_YELLS * FPS; frame < HAUSMUELL_DURATION * FPS; frame++) {
    expect(side(frame)).toBe(first);
  }
});

test("whoever speaks is on screen, so the bubble's tail can point at them", { timeout: 120_000 }, () => {
  for (const line of LINES) {
    for (let t = line.from; t <= line.to; t += 0.1) {
      const [x, y] = mouthOnScreen(t, line.speaker);
      expect(x).toBeGreaterThan(0);
      expect(x).toBeLessThan(FRAME_SIZE.width);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(FRAME_SIZE.height);
    }
  }
});

test("his chin keeps clear of the box and its flaps, by at least their ink outline", { timeout: 300_000 }, () => {
  const problems: string[] = [];
  for (let frame = 0; frame < HAUSMUELL_DURATION * FPS; frame++) {
    const { tibik, karton } = solveHausmuell(frame / FPS);
    const gap = headToKarton(tibik, karton);
    if (gap < OUTLINE) {
      problems.push(`frame ${frame}: head ${(gap * 1000).toFixed(1)} mm from the box`);
    }
  }
  expect(problems).toEqual([]);
});
