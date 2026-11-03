import { PerspectiveCamera, Vector3 } from "three";
import { bodyColliders, type Skeleton } from "../../characters/skeleton";
import { KAREN_SKELETON } from "../../Karen/rig";
import { RIG } from "../../Tibik/rig";
import { cameraAt } from "./cameras";
import { solveHausmuell } from "./solve";

export type Speaker = "tibik" | "karen";
export const FRAME_SIZE = { width: 1920, height: 1080 };

const mouthInWorld = (skeleton: Skeleton, placement: Parameters<typeof bodyColliders>[1]) => {
  const head = bodyColliders(skeleton, placement).head.filter((p) => !/eye|iris|hair/i.test(p.name));
  const center = head.reduce((sum, p) => sum.add(p.center), new Vector3()).divideScalar(head.length);
  return center.add(new Vector3(0, -0.1, 0));
};

const camera = new PerspectiveCamera(40, FRAME_SIZE.width / FRAME_SIZE.height, 0.03, 1000);

export const mouthOnScreen = (t: number, speaker: Speaker): [number, number] => {
  const state = solveHausmuell(t);
  const mouth =
    speaker === "tibik"
      ? mouthInWorld(RIG, state.tibik)
      : mouthInWorld(KAREN_SKELETON, state.karen);
  const setup = cameraAt(t);
  camera.fov = setup.fov;
  camera.position.set(...setup.position);
  camera.lookAt(...setup.target);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  const ndc = mouth.project(camera);
  return [((ndc.x + 1) / 2) * FRAME_SIZE.width, ((1 - ndc.y) / 2) * FRAME_SIZE.height];
};
