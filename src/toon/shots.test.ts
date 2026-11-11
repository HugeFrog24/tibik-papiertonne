import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import type { Vec3 } from "./primitives";
import { amidst, weighedAmidst, between, camerasOf, following, heldBetween, levelWith, smoothed, filmShownIn, withTall, fixed, filmTimeIn, heardUntilIn, inFormat, onFrames, reframe, sinceTheCut, storyJumpsIn, storyTimeIn, type CameraSetup, type Shot } from "./shots";

const SHOTS: readonly Shot[] = [
  { name: "plain", from: 0, to: 2, at: fixed([0, 0, 0], [0, 0, -1], 50) },
  { name: "later", from: 2, to: 4, story: 100, at: fixed([0, 0, 0], [0, 0, -1], 50) },
];

test("story time equals film time in a shot without a story start, and runs from its story start in one with it", () => {
  expect(storyTimeIn(SHOTS)(1)).toBe(1);
  expect(storyTimeIn(SHOTS)(3)).toBe(101);
  expect(filmTimeIn(SHOTS)(101)).toBe(3);
  expect(filmTimeIn(SHOTS)(1)).toBe(1);
  expect(filmTimeIn(SHOTS)(50)).toBeNull();
});

test("story time is the story start plus the time into the shot, summed in that order so a shot list gives the values it always gave", () => {
  const shots: readonly Shot[] = [{ name: "late", from: 0.1, to: 1, story: 0.7, at: fixed([0, 0, 0], [0, 0, -1], 50) }];
  expect(storyTimeIn(shots)(0.3)).toBe(0.7 + (0.3 - 0.1));
  expect(filmTimeIn(shots)(0.9)).toBe(0.1 + (0.9 - 0.7));
});

test("a story jump is a cut where story time leaps, and a sound is heard until the next jump or the end", () => {
  const at = fixed([0, 0, 0], [0, 0, -1], 50);
  const shots: readonly Shot[] = [
    { name: "a", from: 0, to: 2, at },
    { name: "b", from: 2, to: 3, story: 2, at },
    { name: "c", from: 3, to: 5, story: 40, at },
    { name: "d", from: 5, to: 6, story: 42, at },
  ];
  expect(storyJumpsIn(shots)).toEqual([3]);
  const until = heardUntilIn(shots, 6);
  expect([until(1), until(2.99), until(3), until(5.5)]).toEqual([3, 3, 6, 6]);
});

test("a story moment is shown at its film time, and one in a skipped stretch at the cut after it", () => {
  const shown = filmShownIn(SHOTS);
  expect([shown(1), shown(50), shown(101)]).toEqual([1, 2, 3]);
});

test("a shot without a tall camera films the same in both formats; with one, the tall format uses it", () => {
  const wide = fixed([0, 1, 5], [0, 1, 0], 40);
  const tall = fixed([1, 1, 5], [0, 1, 0], 50);
  const plain: Shot = { name: "plain", from: 0, to: 1, at: wide };
  const both: Shot = { name: "both", from: 1, to: 2, at: wide, tall };
  expect(inFormat(plain, "tall").at(0.5)).toEqual(wide());
  expect(inFormat(both, "wide").at(1.5)).toEqual(wide());
  expect(inFormat(both, "tall").at(1.5)).toEqual(tall());
  const { cameraAt } = camerasOf([plain, both]);
  expect(cameraAt(1.5)).toEqual(wide());
  expect(cameraAt(1.5, "tall")).toEqual(tall());
  expect(cameraAt(0.5, "tall")).toEqual(wide());
});

test("reframe keeps the camera's position and changes only its aim and lens", () => {
  const moving = (t: number): CameraSetup => ({ position: [t, 1, 5], target: [0, 1, 0], fov: 40, up: [0, 1, 0] });
  const turned = reframe(moving, { aimAt: (t) => [t, 1.2, 0], fov: 50 });
  expect(turned(0.3)).toEqual({ position: [0.3, 1, 5], target: [0.3, 1.2, 0], fov: 50, up: [0, 1, 0] });
  expect(reframe(moving, {})(0.3)).toEqual(moving(0.3));
});

test("cameras given a story clock film each shot at its story time, in either format", () => {
  const moving = (t: number): CameraSetup => ({ position: [t, 1, 5], target: [0, 1, 0], fov: 40 });
  const shots: readonly Shot[] = [{ name: "later", from: 0, to: 2, story: 100, at: moving, tall: (t) => ({ ...moving(t), fov: 50 }) }];
  const { cameraAt } = camerasOf(shots, storyTimeIn(shots));
  expect(cameraAt(1)).toEqual(moving(101));
  expect(cameraAt(1, "tall")).toEqual({ ...moving(101), fov: 50 });
});

test("reframe can shift the aim from where the shot looks, and between gives the middle of moving points", () => {
  const moving = (t: number): CameraSetup => ({ position: [t, 1, 5], target: [t, 1, 0], fov: 40 });
  expect(reframe(moving, { shift: [0, -0.2, 0] })(0.5).target).toEqual([0.5, 0.8, 0]);
  expect(reframe(moving, { aimAt: () => [1, 1, 1], shift: [0, 0.5, 0] })(0.5).target).toEqual([1, 1.5, 1]);
  expect(between((t) => [t, 0, 0], () => [2, 2, 2])(1)).toEqual([1.5, 1, 1]);
});

test("withTall keeps a shot's camera for the wide format and reframes the same camera for the tall one", () => {
  const moving = (t: number): CameraSetup => ({ position: [t, 1, 5], target: [t, 1, 0], fov: 40 });
  const both = withTall(moving, { fov: 55 });
  expect(both.at).toBe(moving);
  expect(both.tall(0.5)).toEqual({ ...moving(0.5), fov: 55 });
});

test("heldBetween follows a moving point only inside its window and holds it outside", () => {
  const moving = heldBetween((t: number) => t * 2, 1, 3);
  expect([0, 1, 2, 3, 4].map(moving)).toEqual([2, 2, 4, 6, 6]);
});

test("amidst aims halfway between where two points are seen from the eye, however far each is", () => {
  const aim = amidst([0, 0, 0], () => [1, 0, -1], () => [-3, 0, -3])(0);
  expect(aim[0]).toBeCloseTo(0, 9);
  expect(aim[1]).toBeCloseTo(0, 9);
  expect(aim[2]).toBeLessThan(0);
});

test("following keeps the shot for the wide format and, for the tall one, turns it across to a moving point at the height the shot aims at", () => {
  const shot = (): CameraSetup => ({ position: [0, 2, 5], target: [0, 1, 0], fov: 40 });
  const followed = following(shot, (t) => [t, 9, -t], { fov: 50 });
  expect(followed.at).toBe(shot);
  const tall = followed.tall(0.5);
  expect(tall.position).toEqual([0, 2, 5]);
  expect(tall.fov).toBe(50);
  [0.5, 1, -0.5].forEach((v, i) => { expect(tall.target[i]).toBeCloseTo(v, 12); });
});

test("levelWith aims across at a moving point while keeping the height the shot aims at", () => {
  const shot = (t: number): CameraSetup => ({ position: [0, 2, 5], target: [0, 1 + t, 0], fov: 40 });
  expect(levelWith(shot, (t) => [t, 9, -t])(0.5)).toEqual([0.5, 1.5, -0.5]);
});

test("smoothed averages a moving point over a window centred on the moment, so a jerk becomes a glide and a steady point stays put", () => {
  const steady = smoothed(() => [1, 2, 3], 1);
  expect(steady(5)).toEqual([1, 2, 3]);
  const step = smoothed((t) => [t < 0 ? 0 : 1, 0, 0], 1);
  expect(step(-1)[0]).toBe(0);
  expect(step(1)[0]).toBe(1);
  expect(step(0)[0]).toBeGreaterThan(0.3);
  expect(step(0)[0]).toBeLessThan(0.7);
  const linear = smoothed((t) => [t, 0, 0], 1);
  expect(linear(2)[0]).toBeCloseTo(2, 12);
});

test("weighedAmidst leans toward the heavier point: equal weights aim as amidst does, a weight of 0 ignores its point", () => {
  const near = (): Vec3 => [1, 0, -1];
  const far = (): Vec3 => [-3, 0, -3];
  const even = weighedAmidst([0, 0, 0], [near, () => 1], [far, () => 1])(0);
  amidst([0, 0, 0], near, far)(0).forEach((v, i) => { expect(even[i]).toBeCloseTo(v, 12); });
  const alone = weighedAmidst([0, 0, 0], [near, () => 1], [far, () => 0])(0);
  near().forEach((v, i) => { expect(alone[i]).toBeCloseTo(v, 12); });
  const leaning = weighedAmidst([0, 0, 0], [near, () => 1], [far, () => 0.5])(0);
  expect(Math.atan2(leaning[0], -leaning[2])).toBeGreaterThan(Math.atan2(even[0], -even[2]));
});

test("weighedAmidst never aims nowhere: a negative weight counts as none, and with every weight at none it aims as amidst does", () => {
  const near = (): Vec3 => [1, 0, -1];
  const far = (): Vec3 => [-3, 0, -3];
  const none = weighedAmidst([0, 0, 0], [near, () => 0], [far, () => 0])(0);
  amidst([0, 0, 0], near, far)(0).forEach((v, i) => { expect(none[i]).toBeCloseTo(v, 12); });
  const negative = weighedAmidst([0, 0, 0], [near, () => 1], [far, () => -1])(0);
  near().forEach((v, i) => { expect(negative[i]).toBeCloseTo(v, 12); });
});

test("amidst puts its aim at the points' own distance from the eye, so a level reframe through it keeps the shot's tilt", () => {
  const aim = amidst([0, 0, 0], () => [1, 0, -1], () => [-1, 0, -1])(0);
  expect(Math.hypot(...aim)).toBeCloseTo(Math.SQRT2, 9);
  const leaning = weighedAmidst([0, 0, 0], [() => [0, 0, -1], () => 1], [() => [0, 0, -3], () => 0])(0);
  expect(Math.hypot(...leaning)).toBeCloseTo(1, 9);
});

test("a shot's camera runs from the cut on the scene's clock: film time unless the scene reads its cameras in story time", () => {
  const at = (t: number): CameraSetup => ({ position: [t, 0, 0], target: [0, 0, -1], fov: 40 });
  const later: Shot = { name: "b", from: 2, to: 5, story: 7, at };
  expect(sinceTheCut({ name: "a", from: 2, to: 5, at }, 0.5).position[0]).toBe(2.5);
  expect(sinceTheCut(later, 0.5).position[0]).toBe(2.5);
  expect(sinceTheCut(later, 0.5, storyTimeIn([later])).position[0]).toBe(7.5);
});

test("no scene hands ShotCameras a camera function of its own, only its clock when it reads its cameras in story time", () => {
  for (const scene of ["hausmuell/Hausmuell", "papiertonnen/Papiertonnen"])
    expect(readFileSync(`src/scenes/${scene}.tsx`, "utf8"), scene).toContain("<ShotCameras shots={SHOTS} />");
  expect(readFileSync("src/scenes/klingelsturm/Klingelsturm.tsx", "utf8")).toContain("<ShotCameras shots={SHOTS} clock={clock} />");
  expect(readFileSync("src/scenes/treppenhaus/Treppenhaus.tsx", "utf8")).toContain("<ShotCameras shots={SHOTS} storyOf={storyTime} />");
});

test("just before its cut a shot's camera keeps its own story clock, so blur sampled across the cut never borrows the shot before's", () => {
  const at = (t: number): CameraSetup => ({ position: [t, 0, 0], target: [0, 0, -1], fov: 40 });
  const earlier: Shot = { name: "a", from: 0, to: 2, at };
  const later: Shot = { name: "b", from: 2, to: 5, story: 7, at };
  expect(sinceTheCut(later, -0.01, storyTimeIn([earlier, later])).position[0]).toBeCloseTo(6.99, 12);
});

test("onFrames puts every cut on a whole frame, the frame the render cuts on", () => {
  const at = (): CameraSetup => ({ position: [0, 0, 0], target: [0, 0, -1], fov: 40 });
  const [shot] = onFrames([{ name: "a", from: 1.35, to: 13.649999999999999, at }]);
  expect([shot.from * 30, shot.to * 30]).toEqual([41, 409]);
});
