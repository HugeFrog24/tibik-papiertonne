import { Vector3 } from "three";
import { allColliders, handPosition, torsoMatrix, type ArmName } from "../characters/skeleton";
import type { Character } from "../physics/guards";
import { FRAME_SIZE, onScreen, seenBy } from "../dialogue/screen";
import { FPS } from "../frameRate";
import { raySphere } from "../physics/rays";
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

export const framesIn = (from: number, to: number, fps = FPS) => {
  const frames: number[] = [];
  for (let f = Math.ceil(from * fps - 1e-6); f < to * fps - 1e-6; f++) frames.push(f / fps);
  return frames;
};

const SIGHT_SLACK = 0.01;

export const hidersOf = (eye: Vector3, target: Vector3, blockers: readonly Sphere[]) => {
  const reach = eye.distanceTo(target) - SIGHT_SLACK;
  const along = target.clone().sub(eye).normalize();
  return blockers.filter((s) => raySphere(eye, along, s) < reach);
};

export const hiddenBy = (eye: Vector3, target: Vector3, blockers: readonly Sphere[]) => hidersOf(eye, target, blockers).length > 0;

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

export const ARM_JERK = { turn: 0.65, hand: 0.3 };

const handInTorso = (c: Character, which: ArmName) =>
  handPosition(c.skeleton, c, which).applyMatrix4(torsoMatrix(c.skeleton, c).clone().invert());

export const armJumps = (
  frames: readonly { readonly t: number; readonly characters: Readonly<Record<string, Character>> }[],
  cuts: readonly number[] = [],
) =>
  frames.slice(1, -1).flatMap(({ t, characters }, i) => {
    const [before, after] = [frames[i], frames[i + 2]];
    if (cuts.some((cut) => cut > before.t && cut <= after.t)) return [];
    return Object.entries(characters).flatMap(([who, now]) => {
      const [was, next] = [before.characters[who], after.characters[who]];
      if (!was || !next) return [];
      return (["leftArm", "rightArm"] as const).flatMap((which) => {
        const [a, b, c] = [was.pose[which], now.pose[which], next.pose[which]];
        const turn = Math.max(...(["raise", "out", "elbow", "inward"] as const).map((k) => Math.abs(c[k] - 2 * b[k] + a[k])));
        const hand = handInTorso(next, which).add(handInTorso(was, which)).sub(handInTorso(now, which).multiplyScalar(2)).length();
        return turn > ARM_JERK.turn || hand > ARM_JERK.hand ? [`${seconds(t)} ${who} ${which}: turns ${turn.toFixed(2)} rad off its course, hand ${mm(hand, 0)}`] : [];
      });
    });
  });
