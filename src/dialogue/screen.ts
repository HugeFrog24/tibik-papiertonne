import { PerspectiveCamera, Vector3 } from "three";
import { bodyColliders, type Skeleton } from "../characters/skeleton";
import type { CameraSetup } from "../scenes/hausmuell/cameras";
import { WORLD_UP } from "../toon/primitives";

export const FRAME_SIZE = { width: 1920, height: 1080 };

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

const camera = new PerspectiveCamera(
  40,
  FRAME_SIZE.width / FRAME_SIZE.height,
  0.03,
  1000,
);

export const onScreen = (
  point: Vector3,
  setup: CameraSetup,
): [number, number] => {
  camera.fov = setup.fov;
  camera.position.set(...setup.position);
  camera.up.set(...(setup.up ?? WORLD_UP));
  camera.lookAt(...setup.target);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  const ndc = point.clone().project(camera);
  return [
    ((ndc.x + 1) / 2) * FRAME_SIZE.width,
    ((1 - ndc.y) / 2) * FRAME_SIZE.height,
  ];
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

export const withinFrame = ([x, y]: readonly [number, number], margin = 0) =>
  x >= margin * FRAME_SIZE.width &&
  x <= (1 - margin) * FRAME_SIZE.width &&
  y >= margin * FRAME_SIZE.height &&
  y <= (1 - margin) * FRAME_SIZE.height;

export const seenBy = (point: Vector3, setup: CameraSetup, margin = 0) =>
  inFront(point, setup) && withinFrame(onScreen(point, setup), margin);
