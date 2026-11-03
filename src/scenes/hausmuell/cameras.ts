import { kf } from "../../characters/animate";
import type { Vec3 } from "../../toon/primitives";
import {
  KAREN_SPOT,
  HAUSMUELL_DURATION,
  SHOT_KAREN_ACCUSES,
  SHOT_KAREN_THREATENS,
  SHOT_KAREN_YELLS,
  SHOT_TIBIK_ASKS,
  SHOT_TIBIK_EXPLAINS,
  TIBIK_SPOT,
} from "./choreography";

export type CameraSetup = { readonly position: Vec3; readonly target: Vec3; readonly fov: number };
export type Shot = { readonly name: string; readonly from: number; readonly to: number; readonly at: (t: number) => CameraSetup };

const HEAD_HEIGHT = { tibik: 1.45, karen: 1.45 };

const across = (() => {
  const dx = KAREN_SPOT[0] - TIBIK_SPOT[0];
  const dz = KAREN_SPOT[2] - TIBIK_SPOT[2];
  const length = Math.hypot(dx, dz);
  return { x: dx / length, z: dz / length };
})();
const streetSide = { x: -across.z, z: across.x };

const overShoulder = (
  from: Vec3,
  to: Vec3,
  towards: { x: number; z: number },
  height: number,
  targetHeight: number,
): CameraSetup => ({
  position: [from[0] + streetSide.x * 0.65 - towards.x * 0.8, height, from[2] + streetSide.z * 0.65 - towards.z * 0.8],
  target: [to[0], targetHeight, to[2]],
  fov: 32,
});

const onKaren = overShoulder(TIBIK_SPOT, KAREN_SPOT, across, 1.55, HEAD_HEIGHT.karen);
const onTibik = overShoulder(KAREN_SPOT, TIBIK_SPOT, { x: -across.x, z: -across.z }, 1.6, HEAD_HEIGHT.tibik);

const pushIn = (setup: CameraSetup, from: number, to: number) => (t: number): CameraSetup => {
  const push = kf(t, [from, to], [0, 0.12]);
  return {
    ...setup,
    position: [
      setup.position[0] + (setup.target[0] - setup.position[0]) * push,
      setup.position[1],
      setup.position[2] + (setup.target[2] - setup.position[2]) * push,
    ],
  };
};

export const SHOTS: readonly Shot[] = [
  {
    name: "Wide: Karen comes running",
    from: 0,
    to: SHOT_KAREN_YELLS,
    at: () => ({ position: [2.4, 1.5, 4.4], target: [2.4, 1.0, -0.6], fov: 40 }),
  },
  { name: "Karen: Das dürfen Sie nicht", from: SHOT_KAREN_YELLS, to: SHOT_TIBIK_ASKS, at: pushIn(onKaren, SHOT_KAREN_YELLS, SHOT_TIBIK_ASKS) },
  { name: "Tibik: Was darf ich nicht", from: SHOT_TIBIK_ASKS, to: SHOT_KAREN_ACCUSES, at: () => onTibik },
  { name: "Karen: Hausmüll", from: SHOT_KAREN_ACCUSES, to: SHOT_TIBIK_EXPLAINS, at: pushIn(onKaren, SHOT_KAREN_ACCUSES, SHOT_TIBIK_EXPLAINS) },
  { name: "Tibik: Umweltschutz", from: SHOT_TIBIK_EXPLAINS, to: SHOT_KAREN_THREATENS, at: pushIn(onTibik, SHOT_TIBIK_EXPLAINS, SHOT_KAREN_THREATENS) },
  {
    name: "Wide: Hausverwaltung",
    from: SHOT_KAREN_THREATENS,
    to: HAUSMUELL_DURATION,
    at: (t) => {
      const push = kf(t, [SHOT_KAREN_THREATENS, HAUSMUELL_DURATION], [0, 1]);
      return { position: [1.9, 1.7 - push * 0.1, 4.8 - push * 0.6], target: [1.6, 1.5, -1.0], fov: 44 };
    },
  },
];

export const cameraAt = (t: number): CameraSetup => (SHOTS.find((s) => t >= s.from && t < s.to) ?? SHOTS[SHOTS.length - 1]).at(t);
