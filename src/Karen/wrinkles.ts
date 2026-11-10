import { BROW_INK, browLine, type FacePoint } from "./face";

export type WrinkleRegion = "forehead" | "nose" | "cheeks" | "eyes";

export type Wrinkle = {
  readonly name: string;
  readonly region: WrinkleRegion;
  readonly points: readonly FacePoint[];
  readonly radius: number;
};

type Shape = Omit<Wrinkle, "radius"> & { readonly weight?: number };

export const WRINKLE = { radius: 0.0024, lift: 0.003, threshold: 0.05 };

const HALF: readonly Shape[] = [
  {
    name: "frown furrow",
    region: "forehead",
    points: [
      [0.008, 0.024],
      [0.0095, 0.036],
      [0.009, 0.049],
    ],
  },
  {
    name: "bridge crease",
    region: "nose",
    points: [
      [0, 0.014],
      [0.01, 0.0155],
      [0.017, 0.019],
    ],
  },
  {
    name: "bunny line",
    region: "nose",
    points: [
      [0.02, 0.011],
      [0.025, 0.006],
      [0.029, 0.0005],
    ],
  },
  {
    name: "nasolabial fold",
    region: "cheeks",
    points: [
      [0.047, -0.024],
      [0.058, -0.04],
      [0.069, -0.057],
      [0.077, -0.072],
      [0.082, -0.085],
    ],
  },
  {
    name: "under-eye line",
    region: "eyes",
    points: [
      [0.044, -0.008],
      [0.058, -0.0125],
      [0.072, -0.008],
    ],
  },
  {
    name: "crow's foot",
    region: "eyes",
    weight: 0.6,
    points: [
      [0.09, 0.024],
      [0.097, 0.019],
      [0.101, 0.012],
    ],
  },
];

const BUNCH = { along: [-0.05, 0.12, 0.3] as const, above: 0.0045 };

const browBunch = (anger: number, radius: number): FacePoint[] => {
  const [[x0, y0], [x1, y1]] = browLine(1, anger);
  const length = Math.hypot(x1 - x0, y1 - y0);
  const away = BROW_INK.radius + radius + BUNCH.above;
  const [nx, ny] = [(y0 - y1) / length, (x1 - x0) / length];
  return BUNCH.along.map(
    (t): FacePoint => [
      x0 + (x1 - x0) * t + nx * away,
      y0 + (y1 - y0) * t + ny * away,
    ],
  );
};

export const wrinklesAt = (anger: number): Wrinkle[] => {
  if (anger <= WRINKLE.threshold) return [];
  const radius = WRINKLE.radius * Math.min(1, anger);
  const half: Shape[] = [
    ...HALF,
    {
      name: "brow bunch",
      region: "forehead" as const,
      points: browBunch(anger, radius),
    },
  ];
  return ([1, -1] as const).flatMap((side) =>
    half.map((w) => ({
      name: `${side === 1 ? "left" : "right"} ${w.name}`,
      region: w.region,
      points: w.points.map(([x, y]): FacePoint => [side * x, y]),
      radius: radius * (w.weight ?? 1),
    })),
  );
};
