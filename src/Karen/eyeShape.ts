import {
  BufferGeometry,
  Color,
  Euler,
  Float32BufferAttribute,
  Matrix4,
  Quaternion,
  Vector3,
} from "three";
import { clamp } from "../characters/scalar";
import { lazy } from "../physics/lazy";
import { facePoint } from "./headShape";

export const EYE = {
  x: 0.058,
  y: 0.02,
  radius: 0.025,
  sink: 0.55,
  lid: 1.07,
  iris: 0.5,
  pupil: 0.19,
  turn: { yaw: 0.45, pitch: 0.35 },
  colours: {
    sclera: "#fbf8f1",
    iris: "#7f97ab",
    limbus: "#3e4f5e",
    pupil: "#111111",
  },
  open: { upper: 0.62, lower: -0.62 },
  angry: { upper: 0.34, lower: -0.4, roll: 0.42 },
  follow: { upper: 0.75, lower: 0.4 },
  overlap: 0.12,
};

export type EyeLids = {
  readonly upper: { readonly height: number; readonly roll: number };
  readonly lower: { readonly height: number };
};

export type EyeTurn = { readonly yaw: number; readonly pitch: number };

const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export const eyeFrame = (side: 1 | -1) => {
  const x = side * EYE.x;
  return new Matrix4().compose(
    facePoint(x, EYE.y, -EYE.sink * EYE.radius),
    new Quaternion(),
    new Vector3(1, 1, 1),
  );
};

export const eyeTurn = (gazeYaw: number, gazePitch: number): EyeTurn => {
  const yaw = clamp(gazeYaw, -EYE.turn.yaw, EYE.turn.yaw);
  const pitch = clamp(gazePitch, -EYE.turn.pitch, EYE.turn.pitch);
  const reach = Math.hypot(yaw / EYE.turn.yaw, pitch / EYE.turn.pitch);
  const scale = reach > 1 ? 1 / reach : 1;
  return { yaw: yaw * scale, pitch: pitch * scale };
};

export const turnEuler = ({ yaw, pitch }: EyeTurn) =>
  new Euler(-pitch, yaw, 0, "YXZ");

export const pupilDirection = (turn: EyeTurn) =>
  new Vector3(0, 0, 1).applyEuler(turnEuler(turn));

export const eyeLids = (
  side: 1 | -1,
  anger: number,
  blink: number,
  pitch: number,
): EyeLids => {
  const a = Math.max(0, Math.min(1, anger));
  const lift = Math.sin(clamp(pitch, -EYE.turn.pitch, EYE.turn.pitch));
  const lower =
    mix(EYE.open.lower, EYE.angry.lower, a) + EYE.follow.lower * lift;
  const open =
    mix(EYE.open.upper, EYE.angry.upper, a) + EYE.follow.upper * lift;
  return {
    upper: {
      height: mix(open, lower - EYE.overlap, blink),
      roll: side * EYE.angry.roll * a * (1 - blink),
    },
    lower: { height: lower },
  };
};

const pole = (roll: number) => new Vector3(-Math.sin(roll), Math.cos(roll), 0);

export const upperEdgeAt = (lids: EyeLids, x: number) =>
  (lids.upper.height + x * Math.sin(lids.upper.roll)) /
  Math.cos(lids.upper.roll);

export const lidCovers = (lids: EyeLids, direction: Vector3) =>
  direction.dot(pole(lids.upper.roll)) > lids.upper.height ||
  direction.y < lids.lower.height;

const EDGE_SPAN = 1.5;
const EDGE_STEPS = 16;

export const lidEdge = (lids: EyeLids, which: "upper" | "lower") => {
  const height = which === "upper" ? lids.upper.height : lids.lower.height;
  const ring = Math.sqrt(Math.max(0, 1 - height * height));
  const roll = which === "upper" ? lids.upper.roll : 0;
  const r = EYE.radius * EYE.lid;
  return Array.from({ length: EDGE_STEPS + 1 }, (_, i) => {
    const phi = -EDGE_SPAN + (2 * EDGE_SPAN * i) / EDGE_STEPS;
    return new Vector3(ring * Math.sin(phi), height, ring * Math.cos(phi))
      .applyEuler(new Euler(0, 0, roll))
      .multiplyScalar(r);
  });
};

const DISC = { lift: 1.004, around: 48, step: 0.05 };

export const irisGeometry = lazy(() => {
  const bands: readonly [number, number, string][] = [
    [0, EYE.pupil, EYE.colours.pupil],
    [EYE.pupil, EYE.iris * 0.86, EYE.colours.iris],
    [EYE.iris * 0.86, EYE.iris, EYE.colours.limbus],
  ];
  const r = EYE.radius * DISC.lift;
  const at = (polar: number, azimuth: number) =>
    new Vector3(
      Math.sin(polar) * Math.cos(azimuth),
      Math.sin(polar) * Math.sin(azimuth),
      Math.cos(polar),
    ).multiplyScalar(r);
  const positions: number[] = [];
  const colours: number[] = [];
  for (const [from, to, hex] of bands) {
    const colour = new Color(hex);
    const rings = Math.max(1, Math.ceil((to - from) / DISC.step));
    for (let k = 0; k < rings; k++) {
      const inner = from + ((to - from) * k) / rings;
      const outer = from + ((to - from) * (k + 1)) / rings;
      for (let j = 0; j < DISC.around; j++) {
        const a = (2 * Math.PI * j) / DISC.around;
        const b = (2 * Math.PI * (j + 1)) / DISC.around;
        const quad = [at(inner, a), at(outer, a), at(outer, b), at(inner, b)];
        const triangles =
          inner === 0
            ? [[quad[0], quad[1], quad[2]]]
            : [
                [quad[0], quad[1], quad[2]],
                [quad[0], quad[2], quad[3]],
              ];
        for (const triangle of triangles)
          for (const p of triangle) {
            positions.push(p.x, p.y, p.z);
            colours.push(colour.r, colour.g, colour.b);
          }
      }
    }
  }
  const normals = positions.map((v) => v / r);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new Float32BufferAttribute(normals, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colours, 3));
  return geometry;
});
