import { Vector2, Vector3 } from "three";
import { expect, test } from "vitest";
import { armIntoTorso, bodyColliders, bustLift, handSphere, sphereDirections, torsoClearance, torsoDepthAt, torsoRadiusAt, torsoSurface } from "../characters/skeleton";
import { sphereObbGap } from "../physics/collision";
import { reachArm } from "../physics/grip";
import { cigaretteObb } from "../props/cigaretteShape";
import { lipsFrame } from "../scenes/klingelsturm/cigarette";
import { fingersOn } from "../scenes/klingelsturm/smoking";
import { karenFaceSurface } from "./mouthEmitter";
import { RIG } from "../Tibik/rig";
import { asKaren } from "./character";
import { KAREN_REST, KAREN_SKELETON as K } from "./rig";

const HALF = 0.16;
const span = (from: number, to: number, n = 400) => Array.from({ length: n + 1 }, (_, i) => from + ((to - from) * i) / n);
const fullest = (x: number) => span(0.1, 0.8).reduce((best, y) => (bustLift(K, x, y) > bustLift(K, x, best) ? y : best), 0.1);
const lowestEdge = (x: number, above: number) => Math.min(...span(0.1, 0.8).filter((y) => bustLift(K, x, y) > above));

test("Karen's bust: two halves either side of her centre, each standing well forward of her plain torso", () => {
  for (const side of [1, -1]) expect(bustLift(K, side * HALF, fullest(side * HALF))).toBeGreaterThan(0.12);
});

test("Karen's bust is wide: it stands at least 5 cm proud across more than 45 cm of her chest", () => {
  const y = fullest(HALF);
  const proud = span(-0.5, 0.5).filter((x) => bustLift(K, x, y) > 0.05);
  expect(Math.max(...proud) - Math.min(...proud)).toBeGreaterThan(0.45);
});

test("Karen's bust hangs: from the top it widens slowly down to its fullest point low in its height, then curves back in quickly", () => {
  for (const side of [1, -1]) {
    const x = side * HALF;
    const swollen = span(0.1, 0.8).filter((y) => bustLift(K, x, y) > 0.005);
    const [bottom, top] = [Math.min(...swollen), Math.max(...swollen)];
    expect((fullest(x) - bottom) / (top - bottom)).toBeLessThan(0.4);
  }
});

test("seen from the front her bust has two lower curves: its underside dips lower under each half than between them", () => {
  for (const side of [1, -1]) expect(lowestEdge(0, 0.02) - lowestEdge(side * HALF, 0.02)).toBeGreaterThan(0.03);
});

test("no crease runs down between the two halves: the swell is flat across her centre line", () => {
  const y = fullest(HALF);
  const step = 0.002;
  expect(Math.abs(bustLift(K, step, y) - bustLift(K, 0, y)) / step).toBeLessThan(0.25);
  expect(bustLift(K, 0, y)).toBeGreaterThan(0.05);
});

test("only Karen has a bust: Tibik's torso is the plain lathe", () => {
  for (const x of span(-0.4, 0.4, 40)) for (const y of span(0, 0.8, 40)) expect(bustLift(RIG, x, y)).toBe(0);
});

test("the drawn torso swells forward by the bust, only at the front", () => {
  const y = fullest(HALF);
  const radius = torsoRadiusAt(K, y).radius;
  const p = new Vector2(radius, y);
  const angle = Math.acos(HALF / radius);
  const front = torsoSurface(K, p, angle);
  expect(front.z - radius * Math.sin(angle) * K.torso.depthScale).toBeCloseTo(bustLift(K, front.x, y) * Math.sin(angle), 9);
  const back = torsoSurface(K, p, -angle);
  expect(back.z).toBeCloseTo(-radius * Math.sin(angle) * K.torso.depthScale, 9);
});

test("the torso depth sees the bust: a point inside the swell reads as inside her, one just in front of it as outside", () => {
  const y = fullest(HALF);
  const radius = torsoRadiusAt(K, y).radius;
  const plain = Math.sqrt(radius ** 2 - HALF ** 2) * K.torso.depthScale;
  const lift = bustLift(K, HALF, y) * Math.sqrt(radius ** 2 - HALF ** 2) / radius;
  expect(torsoDepthAt(K, new Vector3(HALF, y, plain + lift / 2))).toBeGreaterThan(0.03);
  expect(torsoDepthAt(K, new Vector3(HALF, y, plain + lift + 0.02))).toBeLessThan(0);
  expect(torsoClearance(K, new Vector3(HALF, y, plain + lift / 2))).toBeLessThan(-0.03);
  expect(torsoClearance(K, new Vector3(HALF, y, plain + lift + 0.02))).toBeGreaterThan(0);
});

const IN_HER_FIST = { touching: [0, 0.003], intoHer: 0.003 };

test("her arms are long enough to hold a cigarette at the right corner of her mouth in her right fist, without the fist sinking into her face, jowls or hair or the arm into her body", () => {
  const karen = { position: [0, 0, 0] as [number, number, number], rotationY: 0, pose: KAREN_REST, mouthOpen: 0, pointing: false };
  const lips = lipsFrame(karen);
  const cigarette = cigaretteObb(lips, 0);
  const holding = reachArm(asKaren(karen), "rightArm", fingersOn(karen, lips, cigarette), [], null);
  const fist = handSphere(K, holding, "rightArm");
  const gap = sphereObbGap(fist, cigarette);
  expect(gap).toBeGreaterThanOrEqual(IN_HER_FIST.touching[0]);
  expect(gap).toBeLessThanOrEqual(IN_HER_FIST.touching[1]);
  for (const p of karenFaceSurface(karen)) expect(p.distanceTo(fist.center)).toBeGreaterThanOrEqual(fist.radius);
  for (const hair of bodyColliders(K, holding).head.filter((part) => part.name === "hair")) expect(hair.center.distanceTo(fist.center)).toBeGreaterThan(hair.radius + fist.radius);
  expect(armIntoTorso(K, holding.pose, "rightArm")).toBeLessThanOrEqual(IN_HER_FIST.intoHer);
});

const BUST_BALL_POKE = 0.01;

const drawnFront = (x: number, y: number) => {
  const r = torsoRadiusAt(K, y).radius;
  return Math.abs(x) < r ? torsoSurface(K, new Vector2(r, y), Math.acos(x / r)).z : null;
};

test("no collision sphere of her bust pokes out of the drawn bust by more than 1 cm, so nothing bumps into empty jumper", () => {
  const place = { position: [0, 0, 0] as [number, number, number], rotationY: 0, pose: KAREN_REST };
  const plain = bodyColliders({ ...K, torso: { ...K.torso, bulges: [] } }, place).upperTorso.length;
  const balls = bodyColliders(K, place).upperTorso.slice(plain).filter((ball) => ball.name !== "shoulder");
  expect(balls.length).toBeGreaterThan(0);
  const step = 0.002;
  for (const ball of balls)
    for (const d of sphereDirections(200)) {
      const p = ball.center.clone().addScaledVector(d, ball.radius).sub(new Vector3(0, K.hipHeight, 0));
      const z = drawnFront(p.x, p.y);
      if (z === null || p.z <= 0) continue;
      const zx = ((drawnFront(p.x + step, p.y) ?? z) - (drawnFront(p.x - step, p.y) ?? z)) / (2 * step);
      const zy = ((drawnFront(p.x, p.y + step) ?? z) - (drawnFront(p.x, p.y - step) ?? z)) / (2 * step);
      expect((p.z - z) / Math.hypot(1, zx, zy), `ball of ${ball.radius} m at ${p.toArray().map((v) => v.toFixed(3)).join(",")}`).toBeLessThanOrEqual(BUST_BALL_POKE);
    }
});
