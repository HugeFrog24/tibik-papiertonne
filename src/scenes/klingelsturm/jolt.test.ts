import { expect, test } from "vitest";
import { Vector3 } from "three";
import { FPS } from "../../timeline";
import { BANGING } from "./banging";
import { SHOTS, cameraAt } from "./cameras";

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
