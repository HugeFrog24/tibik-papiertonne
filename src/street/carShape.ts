import { Euler } from "three";
import type { Vec3 } from "../toon/primitives";
import { KERB_Z, ROAD_Y, acrossZ, type Part } from "./building";
import { footprint } from "./footprint";

import type { Point2 } from "../characters/scalar";

export type { Point2 };
export type ParkedCar = {
  readonly x: number;
  readonly color: string;
  readonly plate: string;
  readonly hu: 2027 | 2028;
  readonly far?: boolean;
};

export const CAR = { size: [4.2, 1.45, 1.75] as Vec3, z: 3.07 };
export const PARKED_CARS: readonly ParkedCar[] = [
  { x: -40.5, color: "#8a8f96", plate: "MU-FB 330", hu: 2028 },
  { x: -26.0, color: "#9b2c2c", plate: "MU-LE 58", hu: 2027 },
  { x: -20.6, color: "#22252a", plate: "MU-HS 761", hu: 2028 },
  { x: -9.6, color: "#b8bcc2", plate: "MU-TB 112", hu: 2027 },
  { x: -4.9, color: "#2c3e66", plate: "MU-KS 2048", hu: 2028 },
  { x: 6.3, color: "#eeeeea", plate: "MU-RW 77", hu: 2028 },
  { x: 10.9, color: "#4a4f57", plate: "MU-AH 1203", hu: 2027 },
  { x: 17.4, color: "#6f7f8f", plate: "MU-ER 4407", hu: 2027 },
  { x: 23.0, color: "#c3c6ca", plate: "MU-DK 19", hu: 2028 },
  { x: 34.6, color: "#ececea", plate: "MU-GT 902", hu: 2027 },
  { x: -31.0, color: "#2c3e66", plate: "MU-PA 271", hu: 2027, far: true },
  { x: -15.2, color: "#b8bcc2", plate: "MU-NO 88", hu: 2028, far: true },
  { x: -10.3, color: "#8a8f96", plate: "MU-WI 5120", hu: 2027, far: true },
  { x: 1.5, color: "#ececea", plate: "MU-SK 64", hu: 2028, far: true },
  { x: 6.4, color: "#4a4f57", plate: "MU-BB 909", hu: 2027, far: true },
  { x: 15.8, color: "#7a1f2b", plate: "MU-CJ 377", hu: 2028, far: true },
  { x: 29.0, color: "#c3c6ca", plate: "MU-ZT 41", hu: 2027, far: true },
];

export const FRONT = -1;
export const carZ = (car: ParkedCar) => (car.far ? acrossZ(CAR.z) : CAR.z);
export const carFront = (car: ParkedCar) => (car.far ? -FRONT : FRONT);
export const carYaw = (car: ParkedCar) => (carFront(car) > 0 ? 0 : Math.PI);
export const kerbOf = (car: ParkedCar) => (car.far ? acrossZ(KERB_Z) : KERB_Z);

const [, , WIDTH] = CAR.size;
export const SILL = 0.24;
export const WHEEL = {
  radius: 0.31,
  width: 0.2,
  arch: 0.37,
  x: [1.32, -1.32],
  z: WIDTH / 2 - 0.02 - 0.1,
};
export const BODY_BEVEL = { size: 0.06, thickness: 0.07 };
export const GLASS_BEVEL = { size: 0.05, thickness: 0.09 };
export const GREENHOUSE_WIDTH = WIDTH - 0.2;
export const MIRROR = {
  x: 0.97,
  y: 1.0,
  size: [0.12, 0.1] as const,
  reach: 0.18,
};
export const B_PILLAR = [-0.22, -0.12] as const;

const arcOver = (x: number, radius: number): Point2[] => {
  const low = Math.asin((SILL - WHEEL.radius) / radius);
  return Array.from({ length: 17 }, (_, i) => {
    const angle = Math.PI - low - ((Math.PI - 2 * low) * i) / 16;
    return [
      x + radius * Math.cos(angle),
      WHEEL.radius + radius * Math.sin(angle),
    ] as const;
  });
};
const archOver = (x: number) => arcOver(x, WHEEL.arch);

export const BODY: readonly Point2[] = [
  [2.04, SILL],
  [2.1, 0.42],
  [2.09, 0.76],
  [1.96, 0.84],
  [1.12, 0.94],
  [-2.0, 0.97],
  [-2.08, 0.93],
  [-2.1, 0.62],
  [-2.06, SILL],
  ...archOver(WHEEL.x[1]),
  ...archOver(WHEEL.x[0]),
];

export const faceX = (y: number, end: 1 | -1) =>
  end *
  Math.max(
    ...BODY.flatMap((a, i) => {
      const b = BODY[(i + 1) % BODY.length];
      if (
        Math.sign(a[0]) !== end ||
        Math.sign(b[0]) !== end ||
        a[1] === b[1] ||
        (a[1] - y) * (b[1] - y) > 0
      )
        return [];
      return [end * (a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]))];
    }),
  );

export const PLATE = {
  size: [0.52, 0.11] as const,
  lift: 0.004,
  front: 0.47,
  rear: 0.7,
};

export const PLATE_HOLDER = { border: 0.006, strip: 0.02, behind: 0.0015 };
export const holderRect = () => ({
  width: PLATE.size[0] + 2 * PLATE_HOLDER.border,
  height: PLATE.size[1] + PLATE_HOLDER.border + PLATE_HOLDER.strip,
  centre: (PLATE_HOLDER.border - PLATE_HOLDER.strip) / 2,
});
export const DEALER = "Autohaus Weidner";
export const hasDealerStrip = (car: ParkedCar) => {
  const index = PARKED_CARS.indexOf(car);
  if (index < 0) throw new Error(`no parked car ${car.plate}`);
  return index % 3 !== 2;
};
export const INTAKE = { y: 0.33, size: [0.05, 0.09, 0.8] as Vec3, inset: 0.01 };
export const GRILLE = { y: 0.64, size: [0.02, 0.07, 0.56] as Vec3 };
export const plateOn = (y: number, end: 1 | -1) => {
  const half = PLATE.size[1] / 2;
  const [below, above] = [faceX(y - half, end), faceX(y + half, end)];
  const tilt = Math.atan2(above - below, 2 * half);
  return {
    x: (below + above) / 2 + (end * PLATE.lift) / Math.cos(tilt),
    y,
    tilt,
  };
};

export const WHEEL_WELLS: readonly (readonly Point2[])[] =
  WHEEL.x.map(archOver);
export const WELL_WIDTH = 2 * (WHEEL.z - WHEEL.width / 2) - 0.01;
export const LINER = {
  clearance: 0.025,
  width: WIDTH - 2 * BODY_BEVEL.thickness - 0.01,
};
export const ARCH_LINERS: readonly (readonly Point2[])[] = WHEEL.x.map((x) => [
  ...arcOver(x, WHEEL.arch - 0.003),
  ...arcOver(x, WHEEL.radius + LINER.clearance).reverse(),
]);

export const GREENHOUSE: readonly Point2[] = [
  [1.14, 0.9],
  [0.38, 1.43],
  [-0.3, 1.45],
  [-0.98, 1.44],
  [-1.98, 1.05],
  [-2.03, 0.9],
];

export const WINDSHIELD = [GREENHOUSE[0], GREENHOUSE[1]] as const;
export const REAR_WINDOW = [GREENHOUSE[3], GREENHOUSE[4]] as const;

export const windowPane = ([a, b]: readonly [Point2, Point2]) => {
  const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
  const length = Math.hypot(dx, dy);
  const [nx, ny] = [dy / length, -dx / length];
  const lift = 0.004;
  return {
    position: [
      (a[0] + b[0]) / 2 + nx * lift,
      (a[1] + b[1]) / 2 + ny * lift,
      0,
    ] as Vec3,
    rotation: new Euler(0, Math.PI / 2, Math.atan2(ny, nx), "ZYX"),
    size: [
      GREENHOUSE_WIDTH - 2 * GLASS_BEVEL.thickness - 0.04,
      length - 0.12,
    ] as const,
  };
};
export const UMWELTPLAKETTE = { diameter: 0.08, inset: 0.05, lift: 0.001 };

export const plaketteOnPane = (): Vec3 => {
  const [width, length] = windowPane(WINDSHIELD).size;
  const r = UMWELTPLAKETTE.diameter / 2;
  return [
    -(width / 2 - UMWELTPLAKETTE.inset - r),
    -(length / 2 - UMWELTPLAKETTE.inset - r),
    UMWELTPLAKETTE.lift,
  ];
};

const DAYLIGHT: readonly Point2[] = [
  [0.877, 1.0],
  [0.346, 1.37],
  [-0.95, 1.37],
  [-1.55, 1.0],
];

const clipped = (
  outline: readonly Point2[],
  keep: (p: Point2) => number,
): Point2[] =>
  outline.flatMap((a, i) => {
    const b = outline[(i + 1) % outline.length];
    const [ka, kb] = [keep(a), keep(b)];
    const kept: Point2[] = ka >= 0 ? [a] : [];
    if (ka >= 0 !== kb >= 0) {
      const t = ka / (ka - kb);
      kept.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])]);
    }
    return kept;
  });

export const SIDE_WINDOWS: readonly (readonly Point2[])[] = [
  clipped(DAYLIGHT, ([x]) => x - B_PILLAR[1]),
  clipped(DAYLIGHT, ([x]) => B_PILLAR[0] - x),
];

export const tyreFootprints = (car: ParkedCar) =>
  WHEEL.x.flatMap((x) =>
    [1, -1].map((side) =>
      footprint(
        car.x + x,
        carZ(car) + side * WHEEL.z,
        2 * WHEEL.radius,
        WHEEL.width,
      ),
    ),
  );

export const carParts = (car: ParkedCar): Part[] => [
  {
    name: "parked car",
    center: [car.x, ROAD_Y + CAR.size[1] / 2, carZ(car)],
    size: CAR.size,
  },
  ...[1, -1].map(
    (side): Part => ({
      name: "wing mirror",
      center: [
        car.x + carFront(car) * MIRROR.x,
        ROAD_Y + MIRROR.y,
        carZ(car) + side * (WIDTH / 2 + MIRROR.reach / 2),
      ],
      size: [MIRROR.size[0], MIRROR.size[1], MIRROR.reach],
    }),
  ),
];
