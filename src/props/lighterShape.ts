import { Vector3, type Matrix4 } from "three";
import { obb, type Obb } from "../physics/collision";
import type { Vec3 } from "../toon/primitives";

export const LIGHTER = {
  body: [0.025, 0.065, 0.012] as Vec3,
  hood: [0.025, 0.015, 0.012] as Vec3,
  wheel: { radius: 0.0045, width: 0.008 },
  nozzle: [0.004, 0.08, 0] as Vec3,
  lever: { center: [-0.0115, 0.081, 0] as Vec3, size: [0.002, 0.004, 0.009] as Vec3 },
  ink: 0.003,
  plastic: "#c8202a",
  metal: "#b9bcc0",
  steel: "#6d6f72",
};

export const FLAME = {
  height: 0.025,
  radius: 0.005,
  flicker: 0.1,
  lean: 0.08,
  core: "#fff6d8",
  edge: "#ffb347",
  base: "#6fa8ff",
  light: { colour: "#ffb35c", distance: 1.2, decay: 2, intensity: 0.03 },
};

const wobble = (t: number, rates: readonly number[]) =>
  rates.reduce((sum, rate, i) => sum + Math.sin(2 * Math.PI * rate * t + i * 1.7), 0) / rates.length;

export const flameAt = (t: number, amount = 1) => ({
  height: amount * FLAME.height * (1 + FLAME.flicker * wobble(t, [1.7, 2.9, 4.3])),
  lean: FLAME.lean * wobble(t, [0.7, 1.3]),
});

export const SPARKS = { last: 2 / 30, speed: 0.3, from: 0.0045, radius: 0.0008, colour: "#fff1a8" };
const THROWN = [
  [-1, 0.5, 0.3],
  [-0.8, 0.9, -0.4],
  [-1, 0.2, -0.2],
  [-0.6, 0.6, 0.6],
].map((heading) => new Vector3(...heading).normalize());

export const wheelAt = (): Vec3 => [-LIGHTER.body[0] / 4, LIGHTER.body[1] + LIGHTER.hood[1] + LIGHTER.wheel.radius * 0.4, 0];

export const wheelTop = () => new Vector3(...wheelAt()).add(new Vector3(0, LIGHTER.wheel.radius, 0));

export const sparksAt = (sinceStruck: number): Vector3[] =>
  sinceStruck < 0 || sinceStruck >= SPARKS.last
    ? []
    : THROWN.map((heading, i) => wheelTop().addScaledVector(heading, SPARKS.from + SPARKS.speed * sinceStruck * (0.8 + 0.1 * i)));

const TALL = LIGHTER.body[1] + LIGHTER.hood[1] + 1.4 * LIGHTER.wheel.radius;

export const lighterObb = (frame: Matrix4): Obb =>
  obb("lighter", frame, [LIGHTER.body[0], TALL, LIGHTER.body[2]], [0, TALL / 2, 0]);

export const flameTip = (frame: Matrix4, t: number, amount = 1) => {
  const { height, lean } = flameAt(t, amount);
  return new Vector3(...LIGHTER.nozzle)
    .applyMatrix4(frame)
    .add(new Vector3(Math.sin(lean), Math.cos(lean), 0).multiplyScalar(height));
};
