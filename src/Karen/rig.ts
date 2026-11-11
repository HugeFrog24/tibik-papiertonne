import { Euler, Matrix4, Vector3 } from "three";
import { eulerFromBasis } from "../toon/orient";
import { restPose } from "../characters/legs";
import { sphereLattice } from "../characters/scalar";
import type { ArmPose, Pose, Skeleton } from "../characters/skeleton";
import type { Vec3 } from "../toon/primitives";
import { SCALP, hairlinePolar } from "./scalpShape";
import { HEAD_SIZE } from "./headShape";
import { NOSE } from "./noseShape";
import { eyeCentre } from "./eyeShape";

export type { ArmPose, Pose } from "../characters/skeleton";

const HEAD_CENTER: Vec3 = [0, 0.14, 0.235];

const HIP_HEIGHT = 0.485;
const HIP_SPLAY = 0.7;
const FOOT_RADIUS = 0.09;
const FOOT_DROP = (HIP_HEIGHT - FOOT_RADIUS) / Math.cos(HIP_SPLAY);
const LEG_LENGTH = 0.418;
const BELOW_ANKLE = FOOT_DROP - LEG_LENGTH;
export const INK_WIDTH = 0.014;
const SHOE_HEIGHT = 0.065;

export type HairPiece = {
  readonly name:
    | "cap"
    | "scalp"
    | "lock"
    | "fringe"
    | "curtain"
    | "strand"
    | "tuft";
  readonly center: Vec3;
  readonly size: Vec3;
  readonly rotation: Vec3;
  readonly shade: number;
};

const fromHead = ([x, y, z]: Vec3): Vec3 => [
  HEAD_CENTER[0] + x,
  HEAD_CENTER[1] + y,
  HEAD_CENTER[2] + z,
];

const JOWL: Vec3 = [0.0994, -0.075, 0.03];

const hair = (
  name: HairPiece["name"],
  center: Vec3,
  size: Vec3,
  rotation: Vec3 = [0, 0, 0],
  shade = 0,
): HairPiece => ({
  name,
  center: fromHead(center),
  size,
  rotation,
  shade,
});

const CAP = {
  center: [0, 0.04, -0.035] as Vec3,
  size: [0.158, 0.138, 0.152] as Vec3,
};

const anglesOf = (across: Vector3, along: Vector3, normal: Vector3): Vec3 => {
  const e = eulerFromBasis(across, along, normal);
  return [e.x, e.y, e.z];
};

type Ellipsoid = { readonly center: Vec3; readonly size: Vec3 };

const surfaceLock = (
  on: Ellipsoid,
  name: HairPiece["name"],
  azimuth: number,
  polar: number,
  size: Vec3,
  shade: number,
  lift = 0.45,
): HairPiece => {
  const [cx, cy, cz] = on.center;
  const [rx, ry, rz] = on.size;
  const s = [
    Math.sin(polar) * Math.sin(azimuth),
    Math.cos(polar),
    Math.sin(polar) * Math.cos(azimuth),
  ];
  const point = new Vector3(cx + rx * s[0], cy + ry * s[1], cz + rz * s[2]);
  const normal = new Vector3(s[0] / rx, s[1] / ry, s[2] / rz).normalize();
  const down = new Vector3(
    rx * Math.cos(polar) * Math.sin(azimuth),
    -ry * Math.sin(polar),
    rz * Math.cos(polar) * Math.cos(azimuth),
  ).normalize();
  const along = down
    .clone()
    .sub(normal.clone().multiplyScalar(down.dot(normal)))
    .normalize();
  const across = along.clone().cross(normal).normalize();
  const center = point.add(normal.clone().multiplyScalar(size[2] * lift));
  return hair(
    name,
    [center.x, center.y, center.z],
    size,
    anglesOf(across, along, normal),
    shade,
  );
};

const HEAD_SHAPE: Ellipsoid = { center: [0, 0, 0], size: HEAD_SIZE };
const BANGS: readonly [number, number, number][] = [
  [-0.75, 1.02, 0],
  [-0.5, 0.98, 1],
  [-0.25, 0.95, -1],
  [0, 0.94, 0],
  [0.25, 0.95, 1],
  [0.5, 0.98, -1],
  [0.75, 1.02, 0],
];
const HAIRLINE: readonly [number, number, number][] = [
  [-0.32, 0.66, 1],
  [0, 0.6, -1],
  [0.32, 0.66, 0],
];
const hairline = ([azimuth, polar, shade]: [number, number, number]) =>
  surfaceLock(HEAD_SHAPE, "fringe", azimuth, polar, [0.055, 0.08, 0.03], shade);
const bang = ([azimuth, polar, shade]: [number, number, number]) =>
  surfaceLock(
    HEAD_SHAPE,
    "fringe",
    azimuth,
    polar,
    [0.026, 0.05, 0.018],
    shade,
    0.5,
  );

const CURTAIN = {
  center: [0.15, -0.095, 0.04] as Vec3,
  size: [0.05, 0.19, 0.06] as Vec3,
  rotation: [-0.45, 0, 0.1] as Vec3,
};

const STRANDS: readonly {
  readonly at: Vec3;
  readonly size: Vec3;
  readonly turn: number;
  readonly shade: number;
}[] = [
  { at: [0.05, 0.06, 0.6], size: [0.62, 0.92, 0.5], turn: -0.12, shade: 1 },
  { at: [0.35, -0.04, 0.05], size: [0.7, 1.0, 0.52], turn: 0.04, shade: -1 },
  { at: [0.25, 0.12, -0.62], size: [0.62, 0.86, 0.48], turn: 0.16, shade: 0 },
];

const curtainStrands = (side: 1 | -1): HairPiece[] => {
  const frame = new Matrix4().makeRotationFromEuler(
    new Euler(
      CURTAIN.rotation[0],
      CURTAIN.rotation[1],
      side * CURTAIN.rotation[2],
    ),
  );
  const under = hair(
    "curtain",
    [side * CURTAIN.center[0], CURTAIN.center[1], CURTAIN.center[2]],
    [CURTAIN.size[0] * 0.9, CURTAIN.size[1] * 0.95, CURTAIN.size[2] * 0.9],
    [CURTAIN.rotation[0], CURTAIN.rotation[1], side * CURTAIN.rotation[2]],
    -1.5,
  );
  return [
    under,
    ...STRANDS.map(({ at, size, turn, shade }) => {
      const offset = new Vector3(
        side * at[0] * CURTAIN.size[0],
        at[1] * CURTAIN.size[1],
        at[2] * CURTAIN.size[2],
      ).applyMatrix4(frame);
      const rotation = new Euler().setFromRotationMatrix(
        frame.clone().multiply(new Matrix4().makeRotationZ(side * turn)),
      );
      return hair(
        "strand",
        [
          side * CURTAIN.center[0] + offset.x,
          CURTAIN.center[1] + offset.y,
          CURTAIN.center[2] + offset.z,
        ],
        [
          size[0] * CURTAIN.size[0],
          size[1] * CURTAIN.size[1],
          size[2] * CURTAIN.size[2],
        ],
        [rotation.x, rotation.y, rotation.z],
        shade,
      );
    }),
  ];
};

const hangingFrom = (
  azimuth: number,
  polar: number,
  tilt: number,
  lift: number,
) => {
  const out = new Vector3(Math.sin(azimuth), 0, Math.cos(azimuth));
  const across = new Vector3(-Math.cos(azimuth), 0, Math.sin(azimuth));
  const hang = new Vector3(0, -Math.cos(tilt), 0).addScaledVector(
    out,
    Math.sin(tilt),
  );
  const normal = across.clone().cross(hang).normalize();
  const root = new Vector3(
    HEAD_SIZE[0] * Math.sin(polar) * Math.sin(azimuth),
    HEAD_SIZE[1] * Math.cos(polar),
    HEAD_SIZE[2] * Math.sin(polar) * Math.cos(azimuth),
  ).addScaledVector(normal, lift);
  return { across, hang, normal, root };
};

export const NAPE_STRANDS = {
  azimuths: Array.from(
    { length: 9 },
    (_, k) => ((96 + 21 * k) * Math.PI) / 180,
  ),
  rootPolar: 1.2,
  tilt: 0.12,
  size: [0.075, 0.14, 0.012] as const,
};

const napeStrand = (azimuth: number, i: number): HairPiece => {
  const { rootPolar, tilt, size } = NAPE_STRANDS;
  const { across, hang, normal, root } = hangingFrom(
    azimuth,
    rootPolar,
    tilt,
    size[2],
  );
  const center = root.clone().addScaledVector(hang, size[1]);
  const e = eulerFromBasis(across, hang, normal);
  return hair(
    "curtain",
    [center.x, center.y, center.z],
    [size[0], size[1], size[2]],
    [e.x, e.y, e.z],
    SHADES[i % SHADES.length],
  );
};

const SCALP_SHAPE: Ellipsoid = {
  center: [0, 0, 0],
  size: [
    HEAD_SIZE[0] * SCALP.lift,
    HEAD_SIZE[1] * SCALP.lift,
    HEAD_SIZE[2] * SCALP.lift,
  ],
};

const outerLock = (
  azimuth: number,
  polar: number,
  size: Vec3,
  shade: number,
) => {
  const onCap = surfaceLock(CAP, "lock", azimuth, polar, size, shade);
  const onScalp = surfaceLock(SCALP_SHAPE, "lock", azimuth, polar, size, shade);
  const reach = (piece: HairPiece) =>
    new Vector3(...piece.center).distanceTo(new Vector3(...HEAD_CENTER));
  return reach(onCap) >= reach(onScalp) ? onCap : onScalp;
};

const LATTICE = { points: 64, inside: -0.05 };
const SHADES = [0, 1, -1];
const LOCK_SIZE = {
  crown: [0.062, 0.1, 0.036] as Vec3,
  nape: [0.055, 0.075, 0.03] as Vec3,
};

const TEMPLES: readonly [number, number, number][] = [
  [1.3, 0.74, 1],
  [-1.3, 0.74, -1],
  [1.3, 1.12, 0],
  [-1.3, 1.12, 0],
];

const latticeLocks = (): HairPiece[] =>
  sphereLattice(LATTICE.points)
    .map((p, k) => ({ k, ...p }))
    .filter(
      ({ polar, azimuth }) => polar <= hairlinePolar(azimuth) - LATTICE.inside,
    )
    .map(({ k, polar, azimuth }) =>
      outerLock(
        azimuth,
        polar,
        polar > 1.0 ? LOCK_SIZE.nape : LOCK_SIZE.crown,
        SHADES[k % SHADES.length],
      ),
    );

const HAIR: readonly HairPiece[] = [
  hair("cap", CAP.center, CAP.size, [0, 0, 0], -1.5),
  hair("scalp", [0, 0, 0], SCALP_SHAPE.size, [0, 0, 0], -1.5),
  ...latticeLocks(),
  ...TEMPLES.map(([azimuth, polar, shade]) =>
    outerLock(azimuth, polar, LOCK_SIZE.crown, shade),
  ),
  ...HAIRLINE.map(hairline),
  ...BANGS.map(bang),
  ...curtainStrands(1),
  ...curtainStrands(-1),
  ...NAPE_STRANDS.azimuths.map(napeStrand),
  hair("tuft", [0.195, -0.05, -0.02], [0.055, 0.02, 0.035], [0, 0, -0.55]),
  hair("tuft", [-0.05, 0.2, -0.07], [0.05, 0.02, 0.035], [0, 0.4, 0.9]),
];

export const KAREN_SKELETON = {
  hipHeight: HIP_HEIGHT,
  neckHeight: 0.815,
  torso: {
    profile: [
      [0, -0.19],
      [0.26, -0.175],
      [0.38, -0.12],
      [0.42, -0.04],
      [0.435, 0.02],
      [0.47, 0.06],
      [0.51, 0.13],
      [0.53, 0.26],
      [0.518, 0.4],
      [0.4671, 0.53],
      [0.3942, 0.66],
      [0.3198, 0.77],
      [0.2214, 0.855],
      [0.1066, 0.895],
      [0, 0.905],
    ],
    depthScale: 0.55,
    shoulders: { x: 0.3, y: 0.74, size: [0.15, 0.085, 0.085] as Vec3 },
    bulges: [
      { at: [0.16, 0.44], width: 0.19, above: 0.24, below: 0.13, height: 0.16 },
      { at: [-0.16, 0.44], width: 0.19, above: 0.24, below: 0.13, height: 0.16 },
    ],
  },
  headCenter: HEAD_CENTER,
  headSize: HEAD_SIZE,
  jowl: { center: fromHead(JOWL), size: [0.0576, 0.0592, 0.048] as Vec3 },
  head: [
    { name: "head", center: HEAD_CENTER, radius: 0.16 },
    { name: "hair", center: fromHead([0, 0.05, -0.04]), radius: 0.17 },
    { name: "jowl", center: fromHead(JOWL), radius: 0.0592 },
    {
      name: "jowl",
      center: fromHead([-JOWL[0], JOWL[1], JOWL[2]]),
      radius: 0.0592,
    },
    { name: "hair", center: fromHead([0.15, -0.09, 0.02]), radius: 0.06 },
    { name: "hair", center: fromHead([-0.15, -0.09, 0.02]), radius: 0.06 },
    { name: "hair", center: fromHead([0.15, -0.2, 0.07]), radius: 0.045 },
    { name: "hair", center: fromHead([-0.15, -0.2, 0.07]), radius: 0.045 },
    {
      name: "nose",
      center: fromHead(NOSE.center),
      radius: NOSE.size[2] * 1.15,
    },
  ],
  eyes: ([1, -1] as const).map((side) => fromHead(eyeCentre(side).toArray())),
  shoulder: { x: 0.36, y: 0.7 },
  upperArm: { length: 0.324, radius: 0.085, shoulder: 0.115 },
  forearm: { length: 0.288, radius: 0.085, wrist: 0.062 },
  hand: { offset: 0.372, size: [0.0638, 0.0723, 0.0638] as Vec3 },
  hipX: 0.24,
  hipSplay: HIP_SPLAY,
  thigh: { length: LEG_LENGTH / 2, radius: 0.15 },
  shin: { length: LEG_LENGTH / 2, radius: 0.15 },
  foot: {
    offset: [
      BELOW_ANKLE * Math.sin(HIP_SPLAY),
      -BELOW_ANKLE * Math.cos(HIP_SPLAY),
      0.1,
    ] as Vec3,
    size: [0.085, FOOT_RADIUS, 0.16] as Vec3,
  },
  shoe: {
    size: [0.085, SHOE_HEIGHT, 0.15] as Vec3,
    drop: FOOT_RADIUS - SHOE_HEIGHT - INK_WIDTH,
    yaw: 0.28,
  },
  hair: HAIR,
} as const satisfies Skeleton & {
  readonly headCenter: Vec3;
  readonly headSize: Vec3;
  readonly jowl: { readonly center: Vec3; readonly size: Vec3 };
  readonly shoe: {
    readonly size: Vec3;
    readonly drop: number;
    readonly yaw: number;
  };
  readonly hair: readonly HairPiece[];
};

export const KAREN_ARM_REST: ArmPose = {
  raise: 0,
  out: 0.94,
  elbow: 0.85,
  inward: 1.57,
};

export const KAREN_ARM_RUN: ArmPose = {
  raise: 0.15,
  out: 0.94,
  elbow: 1.3,
  inward: 0.3,
};
export const KAREN_RUN_SWING = 0.6;
export const karenRunArm = (swing: number): ArmPose => ({
  ...KAREN_ARM_RUN,
  raise: KAREN_ARM_RUN.raise + swing,
});

export const KAREN_ARM_HIPS: ArmPose = {
  raise: 0,
  out: 1.29,
  elbow: 1.5,
  inward: 1.7,
};

export const KAREN_ARM_POINT: ArmPose = {
  raise: 1.35,
  out: 0.3,
  elbow: 0.1,
  inward: 0,
};

export const KAREN_HEAD_LIMITS = {
  yaw: 0.47,
  pitchDown: 0.26,
  pitchUp: 0.3,
  roll: 0.25,
} as const;

export const limitKarenHead = (pose: Pose): Pose => {
  const { yaw, pitchDown, pitchUp, roll } = KAREN_HEAD_LIMITS;
  const nod = Math.max(0, pose.headPitch);
  const used =
    Math.abs(pose.headYaw) / yaw +
    Math.abs(pose.headRoll) / roll +
    nod / pitchDown;
  const scale = used > 1 ? 1 / used : 1;
  return {
    ...pose,
    headYaw: pose.headYaw * scale,
    headRoll: pose.headRoll * scale,
    headPitch:
      pose.headPitch > 0
        ? pose.headPitch * scale
        : Math.max(-pitchUp, pose.headPitch),
  };
};

export const KAREN_REST: Pose = restPose(KAREN_SKELETON, KAREN_ARM_REST);

export const KAREN_POINTING: Pose = {
  ...KAREN_REST,
  lean: 0.08,
  headPitch: -0.05,
  leftArm: KAREN_ARM_HIPS,
  rightArm: KAREN_ARM_POINT,
};
