import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import type { Vec3 } from "../toon/primitives";
import { FACADE_Z, type Part } from "./building";

export const STAND = {
  length: 1.2,
  height: 0.8,
  knee: 0.4,
  tube: 0.024,
  wallGap: 0.8,
};
export const STAND_XS = [-7.0, -8.3] as const;
export const standZ = (end: 0 | 1) =>
  FACADE_Z + STAND.wallGap + end * STAND.length;

export const BIKE = {
  wheel: 0.35,
  wheelbase: 1.08,
  x: STAND_XS[0] + STAND.tube + 0.31,
  centerZ: FACADE_Z + STAND.wallGap + STAND.length / 2,
  lean: 0.06,
  width: 0.6,
  tyre: 0.025,
};

const HALF = BIKE.wheelbase / 2;
export const BIKE_POINTS = {
  rear: [0, BIKE.wheel, -HALF],
  front: [0, BIKE.wheel, HALF],
  crank: [0, 0.3, -0.06],
  seat: [0, 0.85, -0.2],
  post: [0, 0.95, -0.24],
  head: [0, 0.92, 0.38],
  headLow: [0, 0.75, 0.42],
  stem: [0, 1.0, 0.34],
} satisfies Record<string, Vec3>;

export type BikeRod = {
  readonly from: Vec3;
  readonly to: Vec3;
  readonly radius: number;
  readonly metal: "frame" | "steel";
};
const P = BIKE_POINTS;
export const BIKE_RODS: readonly BikeRod[] = [
  { from: P.crank, to: P.seat, radius: 0.02, metal: "frame" },
  { from: P.seat, to: P.head, radius: 0.02, metal: "frame" },
  { from: P.crank, to: P.headLow, radius: 0.022, metal: "frame" },
  { from: P.crank, to: P.rear, radius: 0.016, metal: "frame" },
  { from: P.seat, to: P.rear, radius: 0.014, metal: "frame" },
  { from: P.headLow, to: P.head, radius: 0.024, metal: "frame" },
  { from: P.headLow, to: P.front, radius: 0.016, metal: "frame" },
  { from: P.seat, to: P.post, radius: 0.013, metal: "steel" },
  { from: P.head, to: P.stem, radius: 0.013, metal: "steel" },
  {
    from: [-BIKE.width / 2, P.stem[1], P.stem[2]],
    to: [BIKE.width / 2, P.stem[1], P.stem[2]],
    radius: 0.012,
    metal: "steel",
  },
  {
    from: [P.crank[0] - 0.09, P.crank[1], P.crank[2]],
    to: [P.crank[0] + 0.09, P.crank[1], P.crank[2]],
    radius: 0.012,
    metal: "steel",
  },
];

export const standRods = (x: number): BikeRod[] => {
  const [z0, z1] = [standZ(0), standZ(1)];
  const { height: h, knee, tube } = STAND;
  return [
    { from: [x, 0, z0], to: [x, h, z0], radius: tube, metal: "steel" },
    { from: [x, 0, z1], to: [x, h, z1], radius: tube, metal: "steel" },
    { from: [x, h, z0], to: [x, h, z1], radius: tube, metal: "steel" },
    {
      from: [x, knee, z0],
      to: [x, knee, z1],
      radius: tube * 0.8,
      metal: "steel",
    },
  ];
};

export const CABLE = {
  radius: 0.0075,
  ink: 0.004,
  z: 0.13,
  wrap: { frame: 0.05, rail: 0.034 },
  sag: 0.12,
  head: { length: 0.075, radius: 0.016 },
};

export const bikeFrame = () =>
  new Matrix4().compose(
    new Vector3(BIKE.x, 0, BIKE.centerZ),
    new Quaternion().setFromEuler(new Euler(0, 0, BIKE.lean)),
    new Vector3(1, 1, 1),
  );

export const standLocal = (p: readonly number[]): Vec3 =>
  new Vector3(p[0], p[1], p[2])
    .applyMatrix4(bikeFrame().invert())
    .toArray();

const crossing = (from: Vec3, to: Vec3, z: number) => {
  const s = (z - from[2]) / (to[2] - from[2]);
  return [from[0] + s * (to[0] - from[0]), from[1] + s * (to[1] - from[1])];
};

const strand = (a: Vec3, b: Vec3, sag: number, n: number): Vec3[] =>
  Array.from({ length: n }, (_, i) => {
    const s = (i + 1) / (n + 1);
    return [
      a[0] + s * (b[0] - a[0]),
      a[1] + s * (b[1] - a[1]) - sag * 4 * s * (1 - s),
      a[2],
    ];
  });

const loopEnds = () => {
  const z = CABLE.z;
  const [ax, ay] = crossing(BIKE_POINTS.crank, BIKE_POINTS.headLow, z);
  const [bx, by] = standLocal([STAND_XS[0], STAND.knee, BIKE.centerZ + z]);
  const up = Math.atan2(-(bx - ax), by - ay);
  const arc = (
    cx: number,
    cy: number,
    r: number,
    from: number,
    n: number,
  ): Vec3[] =>
    Array.from({ length: n + 1 }, (_, i) => {
      const a = from - (Math.PI * i) / n;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a), z];
    });
  return {
    frame: arc(ax, ay, CABLE.wrap.frame, up, 14),
    rail: arc(bx, by, CABLE.wrap.rail, up - Math.PI, 12),
  };
};

export const cableLoop = (): Vec3[] => {
  const { frame, rail } = loopEnds();
  return [
    ...frame,
    ...strand(frame[frame.length - 1], rail[0], CABLE.sag, 9),
    ...rail,
    ...strand(rail[rail.length - 1], frame[0], 0, 5),
  ];
};

export const lockHead = () => {
  const { frame, rail } = loopEnds();
  const [a, b] = [frame[frame.length - 1], rail[0]];
  const mid = new Vector3(
    (a[0] + b[0]) / 2,
    (a[1] + b[1]) / 2 - CABLE.sag,
    a[2],
  );
  const along = new Vector3(b[0] - a[0], b[1] - a[1], 0)
    .normalize()
    .multiplyScalar(CABLE.head.length / 2);
  return {
    from: mid.clone().sub(along).toArray(),
    to: mid.clone().add(along).toArray(),
    radius: CABLE.head.radius,
  };
};

export const bikeParts = (): Part[] => [
  ...STAND_XS.map(
    (x): Part => ({
      name: "bike stand",
      center: [x, STAND.height / 2, (standZ(0) + standZ(1)) / 2],
      size: [2 * STAND.tube, STAND.height, STAND.length],
    }),
  ),
  {
    name: "parked bike",
    center: [BIKE.x, BIKE.wheel + 0.2, BIKE.centerZ] as Vec3,
    size: [BIKE.width, 2 * BIKE.wheel + 0.4, BIKE.wheelbase + 2 * BIKE.wheel],
  },
];
