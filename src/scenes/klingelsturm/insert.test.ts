import { Line3, Vector3 } from "three";
import { bodyColliders } from "../../characters/skeleton";
import { asKaren } from "../../Karen/character";
import { expect, test } from "vitest";
import { seenBy } from "../../dialogue/screen";
import { FPS } from "../../timeline";
import { DIALLED } from "./calls";
import { BELL_PRESSES } from "./choreography";
import { SHOTS, cameraAt } from "./cameras";
import { buttonCenter, handOf, solveKlingelsturm } from "./solve";

const CLOSE_UP = 1.0;

test("an insert shows her finger on his bell button, close up and not hidden by her hand, while she presses it", () => {
  const insert = SHOTS.find((s) => s.name === "Insert: the bell");
  expect(insert).toBeDefined();
  const { from, to } = insert!;
  expect(
    BELL_PRESSES.filter(([at]) => at >= from && at < to).length,
  ).toBeGreaterThanOrEqual(3);
  const problems: string[] = [];
  for (let f = Math.ceil(from * FPS); f < to * FPS; f++) {
    const t = f / FPS;
    const setup = cameraAt(t);
    const button = buttonCenter();
    if (new Vector3(...setup.position).distanceTo(button) > CLOSE_UP)
      problems.push(`${t.toFixed(2)} s: camera too far from the button`);
    if (!seenBy(button, setup, 0.1))
      problems.push(`${t.toFixed(2)} s: button off screen`);
    const state = solveKlingelsturm(t);
    if (!seenBy(handOf(state), setup, 0.05))
      problems.push(`${t.toFixed(2)} s: her hand off screen`);
    const eye = new Vector3(...setup.position);
    const sight = new Line3(eye, button);
    const karen = asKaren(state.karen);
    for (const s of bodyColliders(karen.skeleton, karen).leftArm) {
      const nearest = sight.closestPointToPoint(s.center, true, new Vector3());
      if (nearest.distanceTo(s.center) < s.radius)
        problems.push(`${t.toFixed(2)} s: her ${s.name} hides the button`);
    }
  }
  expect(problems.slice(0, 6)).toEqual([]);
});

test("she dials 110 on the medium shot of her face, with no close-up of the keypad", () => {
  expect(SHOTS.some((s) => s.name.startsWith("Insert: 110"))).toBe(false);
  for (const d of DIALLED) {
    const shot = SHOTS.find((s) => d.at >= s.from && d.at < s.to)!;
    expect(shot.name, d.digit).toMatch(/^Medium/);
  }
});
