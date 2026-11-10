import { CatmullRomCurve3, Euler, Matrix4, Ray, Vector3 } from "three";
import { expect, test } from "vitest";
import { BROW_INK, LIP_INK, browLine, mouthShape } from "./face";
import { facePoint } from "./headShape";
import { EYE, eyeFrame } from "./eyeShape";
import { NOSE, insideNose, noseSkinPoints } from "./noseShape";
import { KAREN_SKELETON as K } from "./rig";
import { WRINKLE, wrinklesAt } from "./wrinkles";

const SPACING = 0.0015;

const curveOf = (points: readonly Vector3[]) =>
  new CatmullRomCurve3(points.map((p) => p.clone())).getSpacedPoints(40);

const lineOf = (points: readonly (readonly [number, number])[], lift: number) =>
  curveOf(points.map(([x, y]) => facePoint(x, y, lift)));

const nearSegment = (p: Vector3, line: readonly Vector3[]) =>
  Math.min(...line.map((q) => q.distanceTo(p)));

test("anger shows as wrinkles on her forehead, nose and cheeks and around her eyes; calm, none", () => {
  expect(wrinklesAt(0)).toEqual([]);
  const angry = wrinklesAt(1);
  const regions = new Set(angry.map((w) => w.region));
  for (const region of ["forehead", "nose", "cheeks", "eyes"])
    expect(regions.has(region as never), region).toBe(true);
  for (const side of [1, -1])
    expect(
      angry.some(
        (w) => w.region === "cheeks" && Math.sign(w.points[0][0]) === side,
      ),
    ).toBe(true);
  const half = wrinklesAt(0.5);
  expect(half.length).toBe(angry.length);
  expect(half[0].radius).toBeLessThan(angry[0].radius);
  expect(angry[0].radius).toBeCloseTo(WRINKLE.radius, 9);
});

test("the wrinkles mirror across her face", () => {
  const angry = wrinklesAt(1);
  for (const w of angry) {
    const mirror = angry.find(
      (m) =>
        m.points.length === w.points.length &&
        m.points.every(
          ([x, y], i) =>
            Math.abs(x + w.points[i][0]) < 1e-9 &&
            Math.abs(y - w.points[i][1]) < 1e-9,
        ),
    );
    expect(mirror, w.name).toBeDefined();
  }
});

test("each wrinkle lies on her skin, clear of her eyes, brows, nose and lips and their ink", () => {
  const problems: string[] = [];
  const nose = noseSkinPoints();
  const lidRadius = EYE.radius * EYE.lid;
  for (const anger of [0.5, 1])
    for (const w of wrinklesAt(anger)) {
      const line = lineOf(w.points, WRINKLE.lift);
      const ink = w.radius;
      for (const side of [1, -1] as const) {
        const eye = new Vector3().setFromMatrixPosition(eyeFrame(side));
        if (nearSegment(eye, line) < lidRadius + ink + SPACING)
          problems.push(`${w.name}: on the ${side} eye`);
        const brow = lineOf(browLine(side, anger), BROW_INK.lift);
        if (
          Math.min(...line.map((p) => nearSegment(p, brow))) <
          BROW_INK.radius + ink
        )
          problems.push(`${w.name}: on the ${side} brow`);
      }
      for (const p of line)
        if (insideNose(p) || nearSegment(p, nose) < NOSE.ink + ink + SPACING) {
          problems.push(`${w.name}: on the nose`);
          break;
        }
      for (const open of [0, 0.5, 1]) {
        const shape = mouthShape(open);
        for (const lip of [shape.top, shape.bottom]) {
          const drawn = lineOf(lip, LIP_INK.lift);
          if (
            Math.min(...line.map((p) => nearSegment(p, drawn))) <
            LIP_INK.radius + ink
          )
            problems.push(`${w.name}: on the lips, open ${open}`);
        }
      }
    }
  expect([...new Set(problems)].slice(0, 8)).toEqual([]);
});

test("seen from the front, her fringe hides no more than a third of any wrinkle", () => {
  const head = new Vector3(...K.headCenter);
  const locks = K.hair
    .filter((h) => h.name === "fringe")
    .map((lock) => {
      const into = new Matrix4()
        .makeRotationFromEuler(new Euler(...lock.rotation))
        .setPosition(...lock.center)
        .invert();
      const squash = new Matrix4().makeScale(
        1 / lock.size[0],
        1 / lock.size[1],
        1 / lock.size[2],
      );
      return squash.multiply(into);
    });
  const hidden = (p: Vector3) =>
    locks.some((m) => {
      const ray = new Ray(
        p.clone().add(head),
        new Vector3(0, 0, 1),
      ).applyMatrix4(m);
      return ray.distanceSqToPoint(new Vector3()) < 1;
    });
  for (const w of wrinklesAt(1)) {
    const line = lineOf(w.points, WRINKLE.lift);
    const share = line.filter(hidden).length / line.length;
    expect(share, w.name).toBeLessThanOrEqual(1 / 3);
  }
});
