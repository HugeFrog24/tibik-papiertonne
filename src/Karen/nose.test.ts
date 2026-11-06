import { Vector3 } from "three";
import { expect, test } from "vitest";
import {
  BROW_INK,
  LIP_INK,
  browLine,
  mouthShape,
  type FacePoint,
} from "./face";
import { EYE, eyeFrame } from "./eyeShape";
import { faceDepth } from "./headShape";
import { NOSE, insideNose, noseSkinPoints, potatoNose } from "./noseShape";
import { KAREN_SKELETON as K } from "./rig";

const EYE_OUTLINE = EYE.radius * EYE.lid;
const BROWS = [0, 1].flatMap((anger) =>
  ([1, -1] as const).map((side) => browLine(side, anger)),
);
const OPENINGS = [0, 0.25, 0.5, 0.75, 1];
const AROUND = 72;
const SPACING = 0.0015;

const skinPoints = noseSkinPoints;

const nearNose = (p: Vector3, grow: number) =>
  insideNose(p) ||
  Math.min(...skinPoints().map((v) => v.distanceTo(p))) < grow + SPACING;

const nearNoseFromTheFront = ([x, y]: FacePoint, grow: number) =>
  insideNose(new Vector3(x, y, NOSE.center[2])) ||
  Math.min(...skinPoints().map((v) => Math.hypot(v.x - x, v.y - y))) <
    grow + SPACING;

const onTheFace = ([x, y]: FacePoint, lift: number) =>
  new Vector3(x, y, faceDepth(x, y) + lift);

const mouthLines = (open: number) => {
  const shape = mouthShape(open);
  return open < 0.03 ? [shape.top] : [shape.top, shape.bottom];
};

const eyeOutlines = () =>
  ([1, -1] as const).flatMap((side) => {
    const centre = new Vector3().setFromMatrixPosition(eyeFrame(side));
    return Array.from({ length: AROUND }, (_, i): FacePoint => {
      const a = (2 * Math.PI * i) / AROUND;
      return [
        centre.x + EYE_OUTLINE * Math.cos(a),
        centre.y + EYE_OUTLINE * Math.sin(a),
      ];
    });
  });

const extent = (pick: (v: Vector3) => number) => {
  const values = skinPoints().map(pick);
  return [Math.min(...values), Math.max(...values)];
};

test("Karen's nose is fat and potato-shaped: a lumpy, flared bulb on her centre line, between her eyes and her mouth", () => {
  expect(NOSE.bumps.filter((b) => b.height > 0).length).toBeGreaterThanOrEqual(
    3,
  );
  expect(NOSE.bumps.some((b) => b.height < 0)).toBe(true);
  expect(NOSE.flare).toBeGreaterThan(0);
  const [left, right] = extent((v) => v.x);
  const [bottom, top] = extent((v) => v.y);
  expect(right - left).toBeGreaterThan(0.05);
  expect(top - bottom).toBeGreaterThan(0.025);
  expect(Math.abs(right + left)).toBeLessThan(0.006);
  const tip = Math.max(...skinPoints().map((v) => v.z - faceDepth(v.x, v.y)));
  expect(tip).toBeGreaterThan(0.022);
  expect(bottom).toBeGreaterThan(mouthShape(0).top[12][1]);
  expect(top).toBeLessThan(EYE.y + EYE_OUTLINE);
});

test("her nose grows out of her face: its back is buried in her head", () => {
  const back = Math.min(...skinPoints().map((v) => v.z - faceDepth(v.x, v.y)));
  expect(back).toBeLessThan(-0.005);
});

test("the nose is drawn as one closed lumpy surface, its outline one ink width outside it", () => {
  const { skin, hull } = potatoNose();
  const p = skin.getAttribute("position");
  const h = hull.getAttribute("position");
  expect(p.count).toBe(h.count);
  const index = skin.getIndex()!;
  const edges = new Map<string, number>();
  for (let i = 0; i < index.count; i += 3)
    for (const [a, b] of [
      [0, 1],
      [1, 2],
      [2, 0],
    ]) {
      const u = index.getX(i + a);
      const v = index.getX(i + b);
      if (u === v) continue;
      const key = u < v ? `${u}-${v}` : `${v}-${u}`;
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  expect([...edges.values()].filter((n) => n !== 2)).toEqual([]);
  for (let i = 0; i < p.count; i++) {
    const v = new Vector3().fromBufferAttribute(p, i);
    const out = new Vector3().fromBufferAttribute(h, i).distanceTo(v);
    expect(out).toBeCloseTo(NOSE.ink, 5);
  }
  const radii = skinPoints().map((v) =>
    v.distanceTo(new Vector3(...NOSE.center)),
  );
  expect(Math.max(...radii) / Math.min(...radii)).toBeGreaterThan(1.3);
});

test("in 3D her nose and its outline keep clear of her lips and their outline, shut or yelling", () => {
  const problems: string[] = [];
  for (const open of OPENINGS)
    for (const line of mouthLines(open))
      for (const p of line)
        if (nearNose(onTheFace(p, LIP_INK.lift), NOSE.ink + LIP_INK.radius))
          problems.push(
            `open ${open}: lip line at (${p[0].toFixed(3)}, ${p[1].toFixed(3)})`,
          );
  expect(problems.slice(0, 6)).toEqual([]);
});

test("seen from the front, her nose's outline touches neither her lips' nor her eyes' nor her brows' outlines", () => {
  const problems: string[] = [];
  for (const open of OPENINGS)
    for (const line of mouthLines(open))
      for (const p of line)
        if (nearNoseFromTheFront(p, NOSE.ink + LIP_INK.radius))
          problems.push(
            `open ${open}: lip (${p[0].toFixed(3)}, ${p[1].toFixed(3)})`,
          );
  for (const p of eyeOutlines())
    if (nearNoseFromTheFront(p, NOSE.ink))
      problems.push(`eye (${p[0].toFixed(3)}, ${p[1].toFixed(3)})`);
  for (const brow of BROWS)
    for (const [x, y] of brow)
      if (nearNoseFromTheFront([x, y], NOSE.ink + BROW_INK.radius))
        problems.push(`brow (${x.toFixed(3)}, ${y.toFixed(3)})`);
  expect(problems.slice(0, 6)).toEqual([]);
});

test("seen from the front, her nose and its outline stay inside the outline of her face", () => {
  const [a, b] = K.headSize;
  const hull = potatoNose().hull.getAttribute("position");
  for (let i = 0; i < hull.count; i++)
    expect((hull.getX(i) / a) ** 2 + (hull.getY(i) / b) ** 2).toBeLessThan(0.8);
});
