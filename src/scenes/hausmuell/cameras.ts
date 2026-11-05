import { kf } from "../../characters/animate";
import { easeUnit, lerpVec3 } from "../../characters/scalar";
import type { Vec3 } from "../../toon/primitives";
import {
  KAREN_SPOT,
  HAUSMUELL_DURATION,
  SHOT_KAREN_ACCUSES,
  SHOT_KAREN_THREATENS,
  SHOT_KAREN_YELLS,
  SHOT_TIBIK_ASKS,
  SHOT_TIBIK_EXPLAINS,
  SHOT_TIBIK_WHO,
  SHOT_KAREN_NAMES,
  SHOT_TIBIK_WEISUNG,
  SHOT_KAREN_WIE,
  SHOT_EXIT,
  TIBIK_SPOT,
} from "./choreography";

export type CameraSetup = {
  readonly position: Vec3;
  readonly target: Vec3;
  readonly fov: number;
  readonly up?: Vec3;
};
export type Shot = {
  readonly name: string;
  readonly from: number;
  readonly to: number;
  readonly at: (t: number) => CameraSetup;
};

export const fixed =
  (position: Vec3, target: Vec3, fov: number) => (): CameraSetup => ({
    position,
    target,
    fov,
  });

export const dolly =
  (from: CameraSetup, to: CameraSetup, start: number, end: number) =>
  (t: number): CameraSetup => {
    const k = easeUnit((t - start) / (end - start));
    return {
      position: lerpVec3(from.position, to.position, k),
      target: lerpVec3(from.target, to.target, k),
      fov: from.fov + (to.fov - from.fov) * k,
    };
  };

export const findShot = <
  S extends { readonly from: number; readonly to: number },
>(
  shots: readonly S[],
  t: number,
): S => shots.find((s) => t >= s.from && t < s.to) ?? shots[shots.length - 1];

export const camerasOf = <S extends Shot>(shots: readonly S[]) => ({
  shotAt: (t: number): S => findShot(shots, t),
  cameraAt: (t: number): CameraSetup => findShot(shots, t).at(t),
});

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
  position: [
    from[0] + streetSide.x * 0.65 - towards.x * 0.8,
    height,
    from[2] + streetSide.z * 0.65 - towards.z * 0.8,
  ],
  target: [to[0], targetHeight, to[2]],
  fov: 32,
});

const onKaren = overShoulder(
  TIBIK_SPOT,
  KAREN_SPOT,
  across,
  1.55,
  HEAD_HEIGHT.karen,
);
const onTibik = overShoulder(
  KAREN_SPOT,
  TIBIK_SPOT,
  { x: -across.x, z: -across.z },
  1.6,
  HEAD_HEIGHT.tibik,
);

const pushIn =
  (setup: CameraSetup, from: number, to: number) =>
  (t: number): CameraSetup => {
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
    at: fixed([2.4, 1.5, 4.4], [2.4, 1.0, -0.6], 40),
  },
  {
    name: "Karen: Das dürfen Sie nicht",
    from: SHOT_KAREN_YELLS,
    to: SHOT_TIBIK_ASKS,
    at: pushIn(onKaren, SHOT_KAREN_YELLS, SHOT_TIBIK_ASKS),
  },
  {
    name: "Tibik: Was darf ich nicht",
    from: SHOT_TIBIK_ASKS,
    to: SHOT_KAREN_ACCUSES,
    at: () => onTibik,
  },
  {
    name: "Karen: Hausmüll",
    from: SHOT_KAREN_ACCUSES,
    to: SHOT_TIBIK_EXPLAINS,
    at: pushIn(onKaren, SHOT_KAREN_ACCUSES, SHOT_TIBIK_EXPLAINS),
  },
  {
    name: "Tibik: Umweltschutz",
    from: SHOT_TIBIK_EXPLAINS,
    to: SHOT_KAREN_THREATENS,
    at: pushIn(onTibik, SHOT_TIBIK_EXPLAINS, SHOT_KAREN_THREATENS),
  },
  {
    name: "Wide: Hausverwaltung",
    from: SHOT_KAREN_THREATENS,
    to: SHOT_TIBIK_WHO,
    at: (t) => {
      const push = kf(t, [SHOT_KAREN_THREATENS, SHOT_TIBIK_WHO], [0, 1]);
      return {
        position: [1.9, 1.7 - push * 0.1, 4.8 - push * 0.6],
        target: [1.6, 1.5, -1.0],
        fov: 44,
      };
    },
  },
  {
    name: "Tibik: Wer sind Sie",
    from: SHOT_TIBIK_WHO,
    to: SHOT_KAREN_NAMES,
    at: () => onTibik,
  },
  {
    name: "Karen: Schulz",
    from: SHOT_KAREN_NAMES,
    to: SHOT_TIBIK_WEISUNG,
    at: pushIn(onKaren, SHOT_KAREN_NAMES, SHOT_TIBIK_WEISUNG),
  },
  {
    name: "Tibik: Weisungsbefugnis",
    from: SHOT_TIBIK_WEISUNG,
    to: SHOT_KAREN_WIE,
    at: pushIn(onTibik, SHOT_TIBIK_WEISUNG, SHOT_KAREN_WIE),
  },
  {
    name: "Karen: Wie bitte",
    from: SHOT_KAREN_WIE,
    to: SHOT_EXIT,
    at: () => onKaren,
  },
  {
    name: "Wide: Schönen Tag noch",
    from: SHOT_EXIT,
    to: HAUSMUELL_DURATION,
    at: fixed([0.9, 1.6, 5.2], [0.6, 1.1, -1.0], 46),
  },
];

export const { cameraAt } = camerasOf(SHOTS);
