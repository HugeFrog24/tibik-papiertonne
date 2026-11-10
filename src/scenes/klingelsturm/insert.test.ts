import { Vector3 } from "three";
import { FORMATS } from "../../frameRate";
import { bodyColliders } from "../../characters/skeleton";
import { asKaren } from "../../Karen/character";
import { expect, test } from "vitest";
import { onScreen, seenBy } from "../../dialogue/screen";
import { SCREEN_CENTRE, SCREEN_CORNERS } from "../../Karen/phoneShape";
import { framesIn, hidersOf, seconds } from "../sceneChecks";
import { CALL_LINES, DIALLED, KEYS, screenAt } from "./calls";
import { BELL_PRESSES, LINES, phoneFrame } from "./choreography";
import { barRect, chunkAt } from "../../dialogue/subtitles";
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
  for (const t of framesIn(from, to)) {
    const setup = cameraAt(t);
    const button = buttonCenter();
    if (new Vector3(...setup.position).distanceTo(button) > CLOSE_UP)
      problems.push(`${t.toFixed(2)} s: camera too far from the button`);
    if (!seenBy(button, setup, 0.1))
      problems.push(`${t.toFixed(2)} s: button off screen`);
    const state = solveKlingelsturm(t);
    if (!seenBy(handOf(state), setup, 0.05))
      problems.push(`${t.toFixed(2)} s: her hand off screen`);
    const karen = asKaren(state.karen);
    for (const s of hidersOf(new Vector3(...setup.position), button, bodyColliders(karen.skeleton, karen).leftArm))
      problems.push(`${t.toFixed(2)} s: her ${s.name} hides the button`);
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

const ON_HER_SCREEN = { facing: (40 * Math.PI) / 180, height: 0.1, margin: 0.05 };

test("once she is already shouting at the police, an insert looks down over her shoulder at 110 on her phone, readable in the 9:16 crop and hidden by nothing, so her dialling itself is never filmed", { timeout: 120_000 }, () => {
  const insert = SHOTS.find((s) => s.name === "Insert: her phone");
  expect(insert).toBeDefined();
  const { from, to } = insert!;
  const shouting = CALL_LINES.find((l) => l.speaker === "karen" && l.from < from && to <= l.to);
  expect(shouting?.text).toBe("MEIN NACHBAR HAT EINEN KARTON AUS DEM HAUSMÜLL GENOMMEN!");
  expect(from).toBeGreaterThan(KEYS[KEYS.length - 1].at);
  expect(to - from).toBeGreaterThanOrEqual(1);
  expect(to - from).toBeLessThanOrEqual(2);
  const problems: string[] = [];
  for (const t of framesIn(from, to)) {
    const at = seconds(t);
    if (screenAt(t) !== "110") problems.push(`${at}: the screen shows "${screenAt(t)}"`);
    const setup = cameraAt(t);
    const eye = new Vector3(...setup.position);
    const state = solveKlingelsturm(t);
    const frame = phoneFrame(state.karen, state.phone!);
    const centre = new Vector3(...SCREEN_CENTRE).applyMatrix4(frame);
    const toEye = eye.clone().sub(centre);
    if (toEye.y < Math.hypot(toEye.x, toEye.z)) problems.push(`${at}: the camera does not look down on the phone`);
    if (new Vector3(0, 0, 1).transformDirection(frame).dot(toEye.normalize()) < Math.cos(ON_HER_SCREEN.facing))
      problems.push(`${at}: the screen turns away from the camera`);
    const karen = asKaren(state.karen);
    const body = bodyColliders(karen.skeleton, karen);
    const blockers = [...body.torso, ...body.head, ...body.leftArm, ...body.rightArm];
    const corners = SCREEN_CORNERS.map((c) => new Vector3(...c).applyMatrix4(frame));
    for (const corner of corners) {
      if (!seenBy(corner, setup, ON_HER_SCREEN.margin)) problems.push(`${at}: a corner of the screen is off the frame`);
      if (!seenBy(corner, cameraAt(t, "tall"), 0, "tall")) problems.push(`${at}: a corner of the screen is outside the 9:16 frame`);
      for (const s of hidersOf(eye, corner, blockers)) problems.push(`${at}: her ${s.name} hides the screen`);
    }
    const tall = Math.abs(onScreen(corners[2], setup)[1] - onScreen(corners[0], setup)[1]);
    if (tall < ON_HER_SCREEN.height * FORMATS.wide.height) problems.push(`${at}: the screen is only ${tall.toFixed(0)} px tall`);
  }
  expect(problems.slice(0, 6)).toEqual([]);
});

test.each(["wide", "tall"] as const)("%s: in the insert of her phone, the subtitle bar never covers its screen", (format) => {
  const insert = SHOTS.find((s) => s.name === "Insert: her phone")!;
  const problems: string[] = [];
  for (const t of framesIn(insert.from, insert.to)) {
    const chunk = chunkAt(LINES, t, format);
    if (!chunk) continue;
    const top = barRect(chunk, format).top;
    const state = solveKlingelsturm(t);
    const frame = phoneFrame(state.karen, state.phone!);
    for (const corner of SCREEN_CORNERS) {
      const [, y] = onScreen(new Vector3(...corner).applyMatrix4(frame), cameraAt(t, format), format);
      if (y > top) problems.push(`${seconds(t)}: a screen corner at ${y.toFixed(0)} under the bar at ${top.toFixed(0)}`);
    }
  }
  expect(problems.slice(0, 4)).toEqual([]);
});
