import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { Vector3 } from "three";
import { blendedNormal, BLEND_REACH, ROOT_REACH, torsoNormalAt } from "../characters/blendNormals";
import { bodyColliders, sphereDirections, torsoProfile, torsoRadiusAt } from "../characters/skeleton";
import { RIG } from "../Tibik/rig";
import { taperedProfile } from "../toon/taper";
import { KAREN_REST, KAREN_SKELETON as K } from "./rig";

const atRest = bodyColliders(K, { position: [0, 0, 0], rotationY: 0, pose: KAREN_REST }).leftArm;

test("her arms hang from shoulders: the joint sits within 12 cm below her neck base and inside her torso's edge", () => {
  expect(K.neckHeight - K.shoulder.y).toBeLessThanOrEqual(0.12);
  expect(K.shoulder.x).toBeLessThanOrEqual(torsoRadiusAt(K, K.shoulder.y).radius);
});

const torsoTopAt = (x: number) => {
  const profile = torsoProfile(K);
  for (let i = profile.length - 1; i > 0; i--) {
    const [a, b] = [profile[i - 1], profile[i]];
    if ((a.x - x) * (b.x - x) <= 0 && a.x !== b.x) return a.y + ((x - a.x) / (b.x - a.x)) * (b.y - a.y);
  }
  return -Infinity;
};

const domeTop = (x: number, cx: number, cy: number, wide: number, high: number) =>
  Math.abs(x - cx) <= wide ? cy + high * Math.sqrt(1 - ((x - cx) / wide) ** 2) : -Infinity;

test("her shoulders: seen from the front, the line from her neck runs out over a rounded shoulder into the arm with no notch", () => {
  const mass = K.torso.shoulders!;
  const top = K.upperArm.shoulder!;
  const xs = Array.from({ length: 41 }, (_, i) => 0.15 + (i / 40) * (K.shoulder.x + top - 0.15));
  const line = xs.map((x) => Math.max(torsoTopAt(x), domeTop(x, mass.x, mass.y, mass.size[0], mass.size[1]), domeTop(x, K.shoulder.x, K.shoulder.y, top, top)));
  const notches = line.flatMap((h, i) => {
    const depth = Math.min(Math.max(...line.slice(0, i + 1)), Math.max(...line.slice(i))) - h;
    return depth > 0.005 ? [`x ${xs[i].toFixed(3)} m: a notch ${(depth * 1000).toFixed(1)} mm deep`] : [];
  });
  expect(notches).toEqual([]);
});

test("her shoulders' collision spheres stay inside the drawn shoulder, poking out of it by at most 1 cm", () => {
  const mass = K.torso.shoulders!;
  const balls = bodyColliders(K, { position: [0, 0, 0], rotationY: 0, pose: KAREN_REST }).upperTorso.filter((s) => s.name === "shoulder");
  expect(balls.length).toBeGreaterThan(6);
  const grown = mass.size.map((r) => r + 0.01);
  for (const ball of balls)
    for (const d of sphereDirections(200)) {
      const p = ball.center.clone().addScaledVector(d, ball.radius).sub(new Vector3(0, K.hipHeight, 0));
      const inside = ((Math.abs(p.x) - mass.x) / grown[0]) ** 2 + ((p.y - mass.y) / grown[1]) ** 2 + (p.z / grown[2]) ** 2;
      expect(inside, `${p.toArray().map((v) => v.toFixed(3))}`).toBeLessThanOrEqual(1);
    }
});

test("what is drawn of her shoulders is what collides: every point of a drawn shoulder outside her torso lies within 1 cm of its collision spheres", () => {
  const mass = K.torso.shoulders!;
  const balls = bodyColliders(K, { position: [0, 0, 0], rotationY: 0, pose: KAREN_REST }).upperTorso.filter((s) => s.name === "shoulder");
  const lift = new Vector3(0, K.hipHeight, 0);
  const uncovered = sphereDirections(400).flatMap((d) =>
    ([1, -1] as const).flatMap((side) => {
      const p = new Vector3(side * mass.x + d.x * mass.size[0], mass.y + d.y * mass.size[1], d.z * mass.size[2]);
      const outsideTorso = Math.hypot(p.x, p.z / K.torso.depthScale) > torsoRadiusAt(K, p.y).radius;
      const gap = Math.min(...balls.map((b) => b.center.distanceTo(p.clone().add(lift)) - b.radius));
      return outsideTorso && gap > 0.01 ? [`${p.toArray().map((v) => v.toFixed(3))}: ${(gap * 1000).toFixed(1)} mm outside its spheres`] : [];
    }),
  );
  expect(uncovered.slice(0, 6)).toEqual([]);
});

test("her shoulder masses sit at her sides only, so her chest and back stay as they were", () => {
  const mass = K.torso.shoulders!;
  expect(mass.x - mass.size[0]).toBeGreaterThan(0.12);
  expect(mass.size[2]).toBeLessThanOrEqual(torsoRadiusAt(K, mass.y).radius * K.torso.depthScale + 0.01);
});

test("near her shoulder the arm's surface takes on the torso's: on the torso the shading normal is the torso's, a hand's width out it is the arm's own, in between it turns gradually", () => {
  const y = K.shoulder.y;
  const onTheSide = new Vector3(torsoRadiusAt(K, y).radius, y, 0);
  const torso = torsoNormalAt(K, onTheSide);
  expect(torso.x).toBeGreaterThan(0.8);
  const own = new Vector3(0, 1, 0);
  expect(blendedNormal(K, onTheSide, own).angleTo(torso)).toBeLessThan(1e-6);
  const out = onTheSide.clone().add(new Vector3(BLEND_REACH + 0.01, 0, 0));
  expect(blendedNormal(K, out, own).angleTo(own)).toBeLessThan(1e-6);
  const angles = [0.25, 0.5, 0.75].map((k) => blendedNormal(K, onTheSide.clone().add(new Vector3(BLEND_REACH * k, 0, 0)), own).angleTo(own));
  angles.slice(1).forEach((a, i) => expect(a).toBeLessThan(angles[i]));
  expect(angles[0]).toBeLessThan(own.angleTo(torso));
});

test("only the root of the arm melts into her: lying against her body more than a shoulder's width from the joint, the arm keeps its own shading", () => {
  const y = K.shoulder.y - 0.3;
  const against = new Vector3(torsoRadiusAt(K, y).radius, y, 0);
  const joint = new Vector3(K.shoulder.x, K.shoulder.y, 0);
  const own = new Vector3(0, 0, 1);
  expect(against.distanceTo(joint)).toBeGreaterThan(ROOT_REACH[1]);
  expect(blendedNormal(K, against, own, joint).angleTo(own)).toBeLessThan(1e-6);
  const nearTheJoint = new Vector3(torsoRadiusAt(K, K.shoulder.y).radius, K.shoulder.y, 0);
  expect(blendedNormal(K, nearTheJoint, own, joint).angleTo(torsoNormalAt(K, nearTheJoint))).toBeLessThan(1e-6);
});

test("her arms taper: thickest at the shoulder, thinner at the elbow, thinnest at the wrist, and her collision spheres follow the drawn arm", () => {
  expect(K.upperArm.shoulder ?? 0).toBeGreaterThan(K.upperArm.radius);
  expect(K.upperArm.radius).toBeGreaterThanOrEqual(K.forearm.radius);
  expect(K.forearm.wrist ?? Infinity).toBeLessThan(K.forearm.radius);
  const upper = atRest.filter((s) => s.name.endsWith("upper arm"));
  const fore = atRest.filter((s) => s.name.endsWith("forearm"));
  expect(upper[0].radius).toBeCloseTo(K.upperArm.shoulder!, 6);
  expect(upper[upper.length - 1].radius).toBeCloseTo(K.upperArm.radius, 6);
  expect(fore[0].radius).toBeCloseTo(K.forearm.radius, 6);
  expect(fore[fore.length - 1].radius).toBeCloseTo(K.forearm.wrist!, 6);
});

test("only Karen's arms change: Tibik's stay even capsules", () => {
  expect(RIG.upperArm).not.toHaveProperty("shoulder");
  expect(RIG.forearm).not.toHaveProperty("wrist");
  const tibik = bodyColliders(RIG, { position: [0, 0, 0], rotationY: 0, pose: { ...KAREN_REST } }).leftArm;
  expect(new Set(tibik.filter((s) => s.name.endsWith("upper arm")).map((s) => s.radius)).size).toBe(1);
});

test("a tapered limb is one smooth shape: round at the top, round at the bottom, joined by one straight tangent line, widest at the top sphere's equator", () => {
  const [top, bottom, length] = [0.115, 0.085, 0.324];
  const profile = taperedProfile(top, bottom, length, 16);
  expect(profile[0].x).toBeCloseTo(0, 9);
  expect(profile[0].y).toBeCloseTo(top, 9);
  expect(profile[profile.length - 1].x).toBeCloseTo(0, 9);
  expect(profile[profile.length - 1].y).toBeCloseTo(-length - bottom, 9);
  expect(Math.max(...profile.map((p) => p.x))).toBeCloseTo(top, 3);
  profile.slice(1).forEach((p, i) => expect(p.y, `point ${i + 1}`).toBeLessThan(profile[i].y));
  const widest = profile.findIndex((p) => p.x === Math.max(...profile.map((q) => q.x)));
  profile.slice(widest + 1).forEach((p, i) => expect(p.x, `point ${widest + i + 1}`).toBeLessThanOrEqual(profile[widest + i].x + 1e-12));
});

test("Karen's torso and arms are one ink unit, so no line is drawn where her shoulders merge into her body", () => {
  const karen = readFileSync(path.join("src", "Karen", "Karen.tsx"), "utf8").replace(/\s+/g, " ");
  expect(karen).toMatch(/<group userData=\{ONE_UNIT\}> <TorsoMesh/);
  expect(karen).toMatch(/inkUnit=\{false\}/);
});
