import { PerspectiveCamera, Vector3 } from "three";
import { bodyColliders, eyesInWorld, faceDirection, type Skeleton } from "../characters/skeleton";
import { aimLens, type CameraSetup } from "../toon/shots";

import { FORMATS, aspectOf, type Format } from "../frameRate";

export const mouthInWorld = (
  skeleton: Skeleton,
  placement: Parameters<typeof bodyColliders>[1],
) => {
  const head = bodyColliders(skeleton, placement).head.filter(
    (p) => !/eye|iris|hair/i.test(p.name),
  );
  const center = head
    .reduce((sum, p) => sum.add(p.center), new Vector3())
    .divideScalar(head.length);
  return center.add(new Vector3(0, -0.1, 0));
};

export type Face = { readonly points: readonly Vector3[]; readonly toward: Vector3 };

export const faceInWorld = (
  skeleton: Skeleton,
  placement: Parameters<typeof bodyColliders>[1],
): Face => ({
  points: [mouthInWorld(skeleton, placement), ...eyesInWorld(skeleton, placement)],
  toward: faceDirection(skeleton, placement),
});

export const headInWorld = (skeleton: Skeleton, placement: Parameters<typeof bodyColliders>[1]) => {
  const top = bodyColliders(skeleton, placement).head.reduce((a, b) => (b.center.y + b.radius > a.center.y + a.radius ? b : a));
  return [top.center.clone().add(new Vector3(0, top.radius, 0)), ...eyesInWorld(skeleton, placement)];
};

const FACE_SEEN = -0.3;

export const faceTurnedTo = (face: Face, point: Vector3, setup: CameraSetup) =>
  face.toward.dot(new Vector3(...setup.position).sub(point).normalize()) > FACE_SEEN;

const CAMERAS: Readonly<Record<Format, PerspectiveCamera>> = {
  wide: new PerspectiveCamera(40, aspectOf("wide"), 0.03, 1000),
  tall: new PerspectiveCamera(40, aspectOf("tall"), 0.03, 1000),
};

export const onScreen = (
  point: Vector3,
  setup: CameraSetup,
  format: Format = "wide",
): [number, number] => {
  const ndc = point.clone().project(aimLens(CAMERAS[format], setup));
  const { width, height } = FORMATS[format];
  return [((ndc.x + 1) / 2) * width, ((1 - ndc.y) / 2) * height];
};

export const inFront = (point: Vector3, setup: CameraSetup) => {
  const eye = new Vector3(...setup.position);
  return (
    point
      .clone()
      .sub(eye)
      .dot(new Vector3(...setup.target).sub(eye)) > 0
  );
};

export const withinFrame = ([x, y]: readonly [number, number], margin = 0, format: Format = "wide") => {
  const { width, height } = FORMATS[format];
  return x >= margin * width && x <= (1 - margin) * width && y >= margin * height && y <= (1 - margin) * height;
};

export const seenBy = (point: Vector3, setup: CameraSetup, margin = 0, format: Format = "wide") =>
  inFront(point, setup) && withinFrame(onScreen(point, setup, format), margin, format);
