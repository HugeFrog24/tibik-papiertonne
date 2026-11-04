import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import { frame } from "../physics/collision";
import { WIND, swayOf, type Spring } from "../physics/wind";
import {
  headRotation,
  torsoDepthAt,
  torsoRotation,
  type Pose,
} from "../characters/skeleton";
import type { Vec3 } from "../toon/primitives";
import { KAREN_SKELETON as K, type HairPiece } from "./rig";

const MOTION: Record<
  HairPiece["name"],
  { readonly give: number; readonly spring: Spring }
> = {
  cap: { give: 0, spring: { hertz: 3, damping: 0.4 } },
  lock: { give: 0.05, spring: { hertz: 2.6, damping: 0.3 } },
  fringe: { give: 0.07, spring: { hertz: 2.2, damping: 0.3 } },
  curtain: { give: 0.08, spring: { hertz: 1.5, damping: 0.3 } },
  strand: { give: 0.13, spring: { hertz: 1.3, damping: 0.25 } },
  tuft: { give: 0.18, spring: { hertz: 3.0, damping: 0.3 } },
  scalp: { give: 0, spring: { hertz: 1, damping: 1 } },
};

export const HAIR_SPRINGS: readonly Spring[] = K.hair.map((piece, i) => {
  const { spring } = MOTION[piece.name];
  return { ...spring, hertz: spring.hertz * (1 + 0.06 * (((i * 7) % 5) - 2)) };
});

export const HAIR_GIVE: readonly number[] = K.hair.map(
  (piece) => MOTION[piece.name].give,
);

const rootedOf = (piece: HairPiece) => {
  const turn = new Quaternion().setFromEuler(new Euler(...piece.rotation));
  const center = new Vector3(...piece.center);
  const reach = new Vector3(0, piece.size[1], 0).applyQuaternion(turn);
  const root =
    reach.y >= 0 ? center.clone().add(reach) : center.clone().sub(reach);
  return { turn, center, root, hang: center.clone().sub(root).normalize() };
};

const bent = (piece: HairPiece, axis: Vector3, angle: number): HairPiece => {
  if (angle === 0) return piece;
  const { turn, center, root } = rootedOf(piece);
  const bend = new Quaternion().setFromAxisAngle(axis, angle);
  const moved = center.clone().sub(root).applyQuaternion(bend).add(root);
  const rotation = new Euler().setFromQuaternion(bend.multiply(turn));
  return {
    ...piece,
    center: moved.toArray() as Vec3,
    rotation: [rotation.x, rotation.y, rotation.z],
  };
};

const blown = (piece: HairPiece, wind: Vector3, amount: number): HairPiece => {
  const axis = rootedOf(piece).hang.cross(wind);
  const angle = amount * axis.length();
  return angle === 0 ? piece : bent(piece, axis.normalize(), angle);
};

const SURFACE = Array.from({ length: 9 }, (_, i) =>
  Array.from({ length: 12 }, (_, j) => {
    const polar = (i / 8) * Math.PI;
    const around = (j / 12) * 2 * Math.PI;
    return new Vector3(
      Math.sin(polar) * Math.cos(around),
      Math.cos(polar),
      Math.sin(polar) * Math.sin(around),
    );
  }),
).flat();

const scratch = new Vector3();

const sinking = (piece: HairPiece, headInTorso: Matrix4) => {
  const placed = new Matrix4()
    .compose(
      new Vector3(...piece.center),
      new Quaternion().setFromEuler(new Euler(...piece.rotation)),
      new Vector3(...piece.size),
    )
    .premultiply(headInTorso);
  return SURFACE.reduce(
    (deepest, u) =>
      Math.max(deepest, torsoDepthAt(K, scratch.copy(u).applyMatrix4(placed))),
    0,
  );
};

const REST_MARGIN = 0.001;
const DRAPE = { most: 1.2, steps: 12 };
const HANGING: readonly HairPiece["name"][] = ["curtain", "strand"];

const draped = (piece: HairPiece, headInTorso: Matrix4): HairPiece => {
  if (!HANGING.includes(piece.name)) return piece;
  if (sinking(piece, headInTorso) <= REST_MARGIN) return piece;
  const { root, hang } = rootedOf(piece);
  const outward = new Vector3(
    root.x - K.headCenter[0],
    0,
    root.z - K.headCenter[2],
  ).normalize();
  const axis = hang.clone().cross(outward);
  if (axis.lengthSq() < 1e-9) return piece;
  axis.normalize();
  let [low, high] = [0, DRAPE.most];
  for (let k = 0; k < DRAPE.steps; k++) {
    const mid = (low + high) / 2;
    if (sinking(bent(piece, axis, mid), headInTorso) <= REST_MARGIN) high = mid;
    else low = mid;
  }
  return bent(piece, axis, high);
};

export const restingHair = (
  wind: Vector3,
  amounts: readonly number[],
  pose: Pose,
): HairPiece[] => {
  const headInTorso = frame(
    new Matrix4(),
    [0, K.neckHeight, 0],
    headRotation(pose),
  );
  return K.hair.map((original, i) => {
    const piece = draped(original, headInTorso);
    if (amounts[i] === 0) return piece;
    const allowed = sinking(piece, headInTorso) + REST_MARGIN;
    const full = blown(piece, wind, amounts[i]);
    if (sinking(full, headInTorso) <= allowed) return full;
    let [low, high] = [0, amounts[i]];
    for (let k = 0; k < 10; k++) {
      const mid = (low + high) / 2;
      if (sinking(blown(piece, wind, mid), headInTorso) <= allowed) low = mid;
      else high = mid;
    }
    return blown(piece, wind, low);
  });
};

export const hairSway = (t: number) =>
  HAIR_GIVE.map((give, i) => give * swayOf(t, HAIR_SPRINGS[i]));

export const windAtHead = (rotationY: number, pose: Pose) =>
  WIND.direction.clone().applyQuaternion(
    new Quaternion()
      .setFromEuler(new Euler(0, rotationY, 0))
      .multiply(new Quaternion().setFromEuler(torsoRotation(pose)))
      .multiply(new Quaternion().setFromEuler(headRotation(pose)))
      .invert(),
  );

export const hairAt = (t: number, rotationY: number, pose: Pose) =>
  restingHair(windAtHead(rotationY, pose), hairSway(t), pose);

export const drapedHair = (pose: Pose) =>
  restingHair(
    new Vector3(),
    K.hair.map(() => 0),
    pose,
  );
