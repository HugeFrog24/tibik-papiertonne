import { expect, test } from "vitest";
import { Vector3 } from "three";
import { FPS } from "../../timeline";
import { BANGING } from "./banging";
import { SHOTS, cameraAt } from "./cameras";
import { onScreen } from "../../dialogue/screen";

const shotOf = (t: number) => SHOTS.find((s) => t >= s.from && t < s.to)!;
const restOf = (t: number) => {
  const shot = shotOf(t);
  return new Vector3(...shot.at(shot.from + 0.05).position);
};
const moved = (t: number) => new Vector3(...cameraAt(t).position).distanceTo(restOf(t));

test("each of her blows jolts the camera of the shot it falls in: it moves within two frames of the blow and is back at rest before her next blow", () => {
  for (const at of BANGING.blows) {
    expect(moved(at - 0.05), `before the blow at ${at}`).toBeLessThan(1e-9);
    const jolt = Math.max(...[1, 2].map((f) => moved(at + f / FPS)));
    expect(jolt, `blow at ${at}`).toBeGreaterThan(0.002);
    expect(moved(at + 0.35), `after the blow at ${at}`).toBeLessThan(1e-9);
  }
});

test("on the landing, closer to her fist, the jolt is larger than in his Flur behind the door", () => {
  const peak = (at: number) => Math.max(...[1, 2].map((f) => moved(at + f / FPS)));
  const landing = BANGING.blows.filter((at) => at < BANGING.flurCut[0]);
  const flur = BANGING.blows.filter((at) => at >= BANGING.flurCut[0]);
  expect(landing.length).toBe(4);
  expect(flur.length).toBe(2);
  expect(Math.min(...landing.map(peak))).toBeGreaterThan(Math.max(...flur.map(peak)));
});

test("only the two banging shots ask for motion blur", () => {
  expect(SHOTS.filter((s) => s.blur).map((s) => s.name)).toEqual(["Wide: the banging", "Flur: the banging"]);
});

test("the jolt is plain to see even on a phone: within two frames of each blow the picture jumps at least 25 px on the landing and 15 px in his Flur, on the 1080-line frame", () => {
  const jump = (at: number) => {
    const aim = new Vector3(...cameraAt(at - 0.05).target);
    const rest = onScreen(aim, cameraAt(at - 0.05));
    return Math.max(...[1, 2].map((f) => {
      const shaken = onScreen(aim, cameraAt(at + f / FPS));
      return Math.hypot(shaken[0] - rest[0], shaken[1] - rest[1]);
    }));
  };
  for (const at of BANGING.blows) {
    const least = at < BANGING.flurCut[0] ? 25 : 15;
    expect(jump(at), `blow at ${at}`).toBeGreaterThanOrEqual(least);
  }
});
