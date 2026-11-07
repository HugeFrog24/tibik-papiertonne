import { Vector3 } from "three";
import { allColliders } from "../characters/skeleton";
import { FRAME_SIZE, onScreen, seenBy } from "../dialogue/screen";
import { asCharacter, type TibikFrame } from "../Tibik/character";
import { headSurface } from "../Tibik/headShape";
import { RIG } from "../Tibik/rig";
import type { CameraSetup } from "../toon/shots";
import {
  collide,
  sphere,
  type Contact,
  type Solid,
  type Sphere,
} from "../physics/collision";

export const TOLERANCE = 0.005;

export const mm = (metres: number, digits = 1) =>
  `${(metres * 1000).toFixed(digits)} mm`;

export const penetrations = <T>(
  times: readonly T[],
  violationsAt: (t: T) => readonly Contact[],
  label: (t: T) => string,
): string[] =>
  times.flatMap((t) =>
    violationsAt(t)
      .filter((c) => c.depth > TOLERANCE)
      .map((c) => `${label(t)}: ${c.a} is ${mm(c.depth, 0)} inside ${c.b}`),
  );

export const seconds = (t: number) => `${t.toFixed(2)} s`;
export const frameLabel = (frame: number) => `frame ${frame}`;
export const framesOf = (duration: number, fps: number, step = 1) =>
  Array.from(
    { length: Math.ceil((duration * fps) / step) },
    (_, i) => i * step,
  );

export const lensProblems = (
  t: number,
  lens: Vector3,
  radius: number,
  solids: readonly Solid[],
  bodies: readonly Sphere[] = [],
  keepOff = radius,
): string[] => {
  const probe = sphere("camera", lens, radius);
  return [
    ...solids
      .filter((s) => collide(probe, s))
      .map((s) => `${seconds(t)}: camera against ${s.name}`),
    ...bodies
      .map((s) => ({ s, clear: lens.distanceTo(s.center) - s.radius }))
      .filter(({ clear }) => clear < keepOff)
      .map(({ s, clear }) => `${seconds(t)}: camera ${mm(clear, 0)} from ${s.name}`),
  ];
};

const HEAD_IN_FRAME = { margin: 0.005 };

export const tibikHeadOutOfFrame = (tibik: TibikFrame, setup: CameraSetup): string[] => {
  const top = headSurface(tibik).reduce((a, b) => (b.y > a.y ? b : a));
  const eyes = allColliders(RIG, asCharacter(tibik))
    .filter((part) => / eye$/.test(part.name))
    .map((eye) => ({ name: eye.name, point: eye.center.clone().add(new Vector3(0, eye.radius, 0)) }));
  return [{ name: "top of his head", point: top }, ...eyes]
    .filter(({ point }) => !seenBy(point, setup, HEAD_IN_FRAME.margin))
    .map(({ name }) => name);
};

export const VERTICAL_CROP = (9 / 16) ** 2;

export const ndcX = (point: Vector3, setup: CameraSetup) => (2 * onScreen(point, setup)[0]) / FRAME_SIZE.width - 1;

export const inVerticalCrop = (point: Vector3, setup: CameraSetup) => Math.abs(ndcX(point, setup)) <= VERTICAL_CROP;
