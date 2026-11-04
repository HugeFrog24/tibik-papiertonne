import { Matrix4, Vector3 } from "three";
import { expect, test } from "vitest";
import type { Line } from "../dialogue/line";
import { FPS } from "../frameRate";
import { halfSpace, obb, sphere } from "../physics/collision";
import { KAREN_REST } from "./rig";
import { sceneSpray } from "./sceneSpray";

const shout: Line = {
  speaker: "karen",
  from: 1,
  to: 3,
  text: "PAPP BAB TAT!",
  name: "test shout",
  tone: "shout",
  box: { left: 0, top: 0, width: 100, height: 100, fontSize: 40 },
};

const karen = {
  position: [0, 0, 0] as [number, number, number],
  rotationY: 0,
  pose: KAREN_REST,
  mouthOpen: 0.8,
};

const build = (asked: number[]) =>
  sceneSpray({
    lines: [shout],
    karenAt: (t) => {
      asked.push(t);
      return karen;
    },
    still: () => [halfSpace("ground", new Vector3(0, 1, 0), 0)],
    moving: () => [],
    people: () => [sphere("someone", new Vector3(0.05, 1.0, 0.8), 0.15)],
    cardboard: () => [
      obb(
        "a box",
        new Matrix4().makeTranslation(-0.05, 0.9, 0.9),
        [0.3, 0.3, 0.3],
      ),
    ],
  });

test("Karen's pose for each droplet is taken at a film frame, so rendering frames in any order gives the same picture", () => {
  const asked: number[] = [];
  build(asked).flights();
  expect(asked.length).toBeGreaterThan(5);
  for (const t of asked)
    expect(Math.abs(t * FPS - Math.round(t * FPS))).toBeLessThan(1e-9);
});

test("each flight knows what it landed on, decided when it landed: cardboard keeps the spot, a person gets none, the ground dries", () => {
  const flights = build([]).flights();
  const kinds = new Map(
    flights.map((f) => [f.landing?.on ?? "nothing", f.kind] as const),
  );
  for (const [on, kind] of kinds) {
    if (on === "a box") expect(kind).toBe("stays");
    if (on === "someone") expect(kind).toBe("none");
    if (on === "ground") expect(kind).toBe("dries");
  }
  expect(flights.every((f) => typeof f.follow === "boolean")).toBe(true);
  expect(flights.some((f) => f.landing?.on === "a box" && f.follow)).toBe(
    flights.some((f) => f.landing?.on === "a box"),
  );
});
