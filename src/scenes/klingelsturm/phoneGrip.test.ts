import { Vector3 } from "three";
import { expect, test } from "vitest";
import { armColliders } from "../../characters/skeleton";
import { asKaren } from "../../Karen/character";
import { PHONE } from "../../Karen/phoneShape";
import { KAREN_SKELETON } from "../../Karen/rig";
import { FPS } from "../../timeline";
import { OUTLINE } from "../../toon/primitives";
import { phoneAt } from "./calls";
import { SHOTS } from "./cameras";
import { KLINGELSTURM_DURATION, phoneFrame } from "./choreography";
import { solveKlingelsturm } from "./solve";

const HALF = PHONE.size.map((v) => v / 2);
const FIST = Math.max(...KAREN_SKELETON.hand.size);

const heldTimes = (step = 1) => {
  const times: number[] = [];
  for (let f = 0; f < KLINGELSTURM_DURATION * FPS; f += step)
    if (phoneAt(f / FPS).inHand) times.push(f / FPS);
  return times;
};

const fistOnPhone = (t: number) => {
  const state = solveKlingelsturm(t);
  const arm = armColliders(KAREN_SKELETON, asKaren(state.karen), "rightArm");
  const toPhone = phoneFrame(state.karen, state.phone!).invert();
  return { state, fist: arm[arm.length - 1].center.clone().applyMatrix4(toPhone) };
};

const boxDistance = (p: Vector3, half: readonly number[]) => {
  const q = [p.x, p.y, p.z].map((v, i) => Math.abs(v) - half[i]);
  return Math.hypot(...q.map((v) => Math.max(v, 0))) + Math.min(Math.max(...q), 0);
};

test("she holds the phone in her fist alone: no fingers, no thumb drawn on it", () => {
  for (const t of heldTimes(15)) expect(Object.keys(phoneAt(t))).not.toContain("thumb");
});

test(
  "her fist never enters the phone, outlines included",
  { timeout: 300_000 },
  () => {
    const problems = heldTimes()
      .map((t) => ({
        t,
        gap: boxDistance(fistOnPhone(t).fist, HALF) - FIST - Math.max(OUTLINE, PHONE.ink),
      }))
      .filter(({ gap }) => gap < 0)
      .map(({ t, gap }) => `${t.toFixed(2)} s: ${(gap * 1000).toFixed(1)} mm`);
    expect(problems.slice(0, 6)).toEqual([]);
  },
);

const backGrid = () =>
  Array.from({ length: 11 * 21 }, (_, k) =>
    new Vector3(
      -HALF[0] + (PHONE.size[0] * (k % 11)) / 10,
      -HALF[1] + (PHONE.size[1] * Math.floor(k / 11)) / 20,
      -HALF[2],
    ),
  );

const EDGE_ON = Math.sin((17 * Math.PI) / 180);

const hiddenByFist = (t: number) => {
  const state = solveKlingelsturm(t);
  const shot = SHOTS.find((s) => t >= s.from && t < s.to)!;
  const toPhone = phoneFrame(state.karen, state.phone!).invert();
  const eye = new Vector3(...shot.at(t).position).applyMatrix4(toPhone);
  if (-eye.z / eye.length() < EDGE_ON) return null;
  const arm = armColliders(KAREN_SKELETON, asKaren(state.karen), "rightArm").map((s) => ({
    center: s.center.clone().applyMatrix4(toPhone),
    radius: s.radius,
  }));
  const grid = backGrid();
  const hidden = grid.filter((p) => {
    const ray = p.clone().sub(eye);
    const length = ray.length();
    ray.normalize();
    return arm.some(({ center, radius }) => {
      const along = center.clone().sub(eye).dot(ray);
      if (along <= 0 || along >= length) return false;
      return center.clone().sub(eye).addScaledVector(ray, -along).length() < radius;
    });
  });
  const topRow = grid.filter((p) => p.y > HALF[1] - 1e-9);
  return {
    share: hidden.length / grid.length,
    topShows: topRow.some((p) => !hidden.includes(p)),
  };
};

test.each(["Medium: the answering machine", "Medium: the police"])(
  "filmed from in front in %s, her fist and arm hide the lower phone and its top still shows",
  (name) => {
    const shot = SHOTS.find((s) => s.name === name)!;
    const seen = [0.2, 0.4, 0.6, 0.8]
      .map((k) => shot.from + k * (shot.to - shot.from))
      .filter((t) => phoneAt(t).inHand)
      .map((t) => ({ t, view: hiddenByFist(t) }))
      .filter((s) => s.view !== null);
    expect(seen.length).toBeGreaterThan(0);
    for (const { t, view } of seen) {
      expect(view!.share, t.toFixed(2)).toBeGreaterThan(0.35);
      expect(view!.topShows, t.toFixed(2)).toBe(true);
    }
  },
);
