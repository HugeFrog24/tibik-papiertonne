import { SphereGeometry, Vector3 } from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { lazy } from "../physics/lazy";
import type { Vec3 } from "../toon/primitives";
import { faceDepth } from "./headShape";

export type NoseBump = {
  readonly name: string;
  readonly toward: Vec3;
  readonly height: number;
  readonly width: number;
};

const AT: readonly [number, number] = [0, -0.021];

export const NOSE = {
  ink: 0.009,
  colour: "#eeb39c",
  center: [AT[0], AT[1], faceDepth(AT[0], AT[1]) + 0.006] as Vec3,
  size: [0.027, 0.0155, 0.024] as Vec3,
  flare: 0.3,
  taper: 0.25,
  bumps: [
    { name: "knobble", toward: [0.35, 0.25, 0.9], height: 0.12, width: 0.42 },
    { name: "left wing", toward: [-0.92, -0.3, 0.25], height: 0.1, width: 0.5 },
    {
      name: "right wing",
      toward: [0.9, -0.32, 0.3],
      height: 0.13,
      width: 0.45,
    },
    { name: "dent", toward: [-0.25, 0.55, 0.8], height: -0.05, width: 0.38 },
  ] as readonly NoseBump[],
  segments: [64, 40] as const,
};

const TOWARD = NOSE.bumps.map((b) => new Vector3(...b.toward).normalize());

const swell = (unit: Vector3) =>
  1 +
  NOSE.bumps.reduce((sum, bump, i) => {
    const angle = unit.angleTo(TOWARD[i]);
    return sum + bump.height * Math.exp(-((angle / bump.width) ** 2));
  }, 0);

const widthAt = (y: number) =>
  NOSE.size[0] *
  (1 +
    NOSE.flare * Math.min(1, Math.max(0, -y / NOSE.size[1])) -
    NOSE.taper * Math.min(1, Math.max(0, y / NOSE.size[1])));

const surfaceAlong = (unit: Vector3): Vector3 => {
  const r = swell(unit);
  const y = unit.y * r * NOSE.size[1];
  return new Vector3(
    NOSE.center[0] + unit.x * r * widthAt(y),
    NOSE.center[1] + y,
    NOSE.center[2] + unit.z * r * NOSE.size[2],
  );
};

export const insideNose = (p: Vector3) => {
  const y = p.y - NOSE.center[1];
  const n = new Vector3(
    (p.x - NOSE.center[0]) / widthAt(y),
    y / NOSE.size[1],
    (p.z - NOSE.center[2]) / NOSE.size[2],
  );
  const r = n.length();
  return r === 0 || r < swell(n.divideScalar(r));
};

export const noseSkinPoints = (): Vector3[] => {
  const p = potatoNose().skin.getAttribute("position");
  return Array.from({ length: p.count }, (_, i) =>
    new Vector3().fromBufferAttribute(p, i),
  );
};

export const potatoNose = lazy(() => {
  const sphere = new SphereGeometry(1, ...NOSE.segments);
  sphere.deleteAttribute("uv");
  sphere.deleteAttribute("normal");
  const skin = mergeVertices(sphere);
  const position = skin.getAttribute("position");
  const unit = new Vector3();
  for (let i = 0; i < position.count; i++) {
    const p = surfaceAlong(unit.fromBufferAttribute(position, i).normalize());
    position.setXYZ(i, p.x, p.y, p.z);
  }
  skin.computeVertexNormals();
  const hull = skin.clone();
  const normal = skin.getAttribute("normal");
  const out = hull.getAttribute("position");
  const point = new Vector3();
  for (let i = 0; i < out.count; i++) {
    point
      .fromBufferAttribute(position, i)
      .addScaledVector(unit.fromBufferAttribute(normal, i), NOSE.ink);
    out.setXYZ(i, point.x, point.y, point.z);
  }
  return { skin, hull };
});
