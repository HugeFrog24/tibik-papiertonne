import { Euler, Matrix4, Vector3 } from "three";
import { frame, obb, type Obb } from "../physics/collision";
import type { Vec3 } from "../toon/primitives";

export type GripSide = "inner" | "outer";
export type Grip = {
  readonly side: GripSide;
  readonly shape: "lever" | "knob" | "bar";
  readonly center: Vec3;
  readonly size: Vec3;
};

export type Door = {
  readonly name: string;
  readonly hinge: Vec3;
  readonly width: number;
  readonly height: number;
  readonly thickness: number;
  readonly closedYaw: number;
  readonly swing: 1 | -1;
  readonly grips: readonly Grip[];
  readonly fitting?: "plates" | "rosettes";
  readonly viewer?: boolean;
};

export const doorFrame = (door: Door, angle: number): Matrix4 =>
  frame(
    new Matrix4(),
    door.hinge,
    new Euler(0, door.closedYaw + door.swing * angle, 0),
  );

export const doorLeaf = (door: Door, angle: number): Obb =>
  obb(
    door.name,
    doorFrame(door, angle),
    [door.width, door.height, door.thickness],
    [door.width / 2, door.height / 2, 0],
  );

export const leverPivot = (grip: Grip): Vec3 => [
  grip.center[0] + grip.size[0] / 2,
  grip.center[1],
  grip.center[2],
];
export const leverArm = (grip: Grip): Vec3 => [
  grip.center[0] - leverPivot(grip)[0],
  0,
  0,
];

export const LEVER = {
  projection: 0.062,
  length: 0.13,
  radius: 0.0107,
  bend: 0.018,
};

export const PLATE = {
  width: 0.046,
  above: 0.065,
  below: 0.205,
  thickness: { inner: 0.009, outer: 0.014 },
};
export const PROFILE = { radius: 0.0085, height: 0.033, tail: 0.005 };
export const KEY_DISTANCE = { inside: 0.072, house: 0.092 };
export const CYLINDER_ROSETTE = { radius: 0.025, thickness: 0.01 };
export const ROSE = { radius: 0.026, thickness: 0.008 };
export const BUNTBART = {
  radius: 0.0045,
  height: 0.017,
  tail: 0.0018,
};
export const POST = { size: 0.025, inset: 0.06 };
export const VIEWER = {
  height: 1.5,
  bore: 0.007,
  cap: 0.0125,
  lens: 0.0065,
  depth: { outer: 0.009, inner: 0.005 },
  eye: 0.001,
};

export const viewerOf = (door: Door) =>
  door.viewer ? { height: VIEWER.height, across: door.width / 2 } : null;

export const keyOf = (door: Door) => ({
  shape: door.fitting === "rosettes" ? BUNTBART : PROFILE,
  distance: door.grips.some((g) => g.shape === "bar")
    ? KEY_DISTANCE.house
    : KEY_DISTANCE.inside,
});

export const lockOf = (door: Door) => {
  const lever = door.grips.find(
    (g) => g.side === "inner" && g.shape === "lever",
  );
  if (!lever) return null;
  const [x, y] = leverPivot(lever);
  return {
    spindle: [x, y] as const,
    hole: [
      x,
      y - keyOf(door).distance,
    ] as const,
    inside: Math.sign(lever.center[2]),
  };
};

type KeyShape = {
  readonly radius: number;
  readonly height: number;
  readonly tail: number;
};

export const keyOutline = ({
  radius,
  height,
  tail,
}: KeyShape): { x: number; y: number }[] => {
  const start = Math.asin(tail / radius);
  const from = -Math.PI / 2 + start;
  const to = (3 * Math.PI) / 2 - start;
  const angles = [
    ...Array.from({ length: 25 }, (_, i) => from + ((to - from) * i) / 24),
    0,
    Math.PI,
  ].sort((a, b) => a - b);
  const arc = angles.map((a) => ({
    x: radius * Math.cos(a),
    y: radius * Math.sin(a),
  }));
  const foot = -(height - radius);
  return [...arc, { x: -tail, y: foot }, { x: tail, y: foot }];
};

export const profileOutline = () => keyOutline(PROFILE);

export const leverGrip = (
  spindleX: number,
  y: number,
  face: number,
  side: GripSide = "inner",
): Grip => ({
  side,
  shape: "lever",
  center: [
    spindleX - LEVER.length / 2,
    y,
    face + Math.sign(face) * LEVER.projection,
  ],
  size: [LEVER.length, 2 * LEVER.radius, 2 * LEVER.radius],
});

const NECK_STEPS = 4;
const BEND_STEPS = 12;
const GRIP_STEPS = 6;

export const leverPath = (): Vector3[] => {
  const { projection, length, radius, bend } = LEVER;
  const neck = Array.from(
    { length: NECK_STEPS },
    (_, i) => new Vector3(0, 0, ((projection - bend) * i) / NECK_STEPS),
  );
  const arc = Array.from({ length: BEND_STEPS + 1 }, (_, i) => {
    const a = ((Math.PI / 2) * i) / BEND_STEPS;
    return new Vector3(
      -bend + bend * Math.cos(a),
      0,
      projection - bend + bend * Math.sin(a),
    );
  });
  const grip = Array.from({ length: GRIP_STEPS }, (_, i) => {
    const x = -bend - ((length - radius - bend) * (i + 1)) / GRIP_STEPS;
    return new Vector3(x, 0, projection);
  });
  return [...neck, ...arc, ...grip];
};

const solidOf = (door: Door, angle: number, grip: Grip, press: number): Obb => {
  const name = `${door.name} ${grip.side} ${grip.shape}`;
  if (grip.shape !== "lever" || press === 0)
    return obb(name, doorFrame(door, angle), grip.size, grip.center);
  const pivot = leverPivot(grip);
  return obb(
    name,
    frame(doorFrame(door, angle), pivot, new Euler(0, 0, press)),
    grip.size,
    leverArm(grip),
  );
};

export const gripSolid = (
  door: Door,
  angle: number,
  side: GripSide,
  press = 0,
): Obb => {
  const grip = door.grips.find((g) => g.side === side);
  if (!grip) throw new Error(`${door.name} has no ${side} handle`);
  return solidOf(door, angle, grip, press);
};

const faceOf = (door: Door, side: GripSide) => {
  const lock = lockOf(door)!;
  return side === "inner" ? lock.inside : -lock.inside;
};

export type FittingPart = {
  readonly name: string;
  readonly shape: "box" | "disc";
  readonly center: Vec3;
  readonly size: Vec3;
};

export type FittingFace = {
  readonly kind: "cylinder" | "keyhole" | "lens" | "eyepiece";
  readonly center: Vec3;
  readonly out: number;
};

const partOn = (
  door: Door,
  side: GripSide,
  name: string,
  shape: FittingPart["shape"],
  [x, y]: readonly [number, number],
  [width, height, depth]: Vec3,
): FittingPart => ({
  name: `${door.name} ${side} ${name}`,
  shape,
  center: [x, y, faceOf(door, side) * (door.thickness / 2 + depth / 2)],
  size: [width, height, depth],
});

const disc = (
  door: Door,
  side: GripSide,
  name: string,
  at: readonly [number, number],
  { radius, thickness }: { radius: number; thickness: number },
) => partOn(door, side, name, "disc", at, [2 * radius, 2 * radius, thickness]);

const plate = (door: Door, side: GripSide) => {
  const [x, y] = lockOf(door)!.spindle;
  return partOn(
    door,
    side,
    "plate",
    "box",
    [x, y + (PLATE.above - PLATE.below) / 2],
    [PLATE.width, PLATE.above + PLATE.below, PLATE.thickness[side]],
  );
};

export const fittingsOf = (
  door: Door,
): { readonly parts: FittingPart[]; readonly faces: FittingFace[] } => {
  const lock = lockOf(door);
  const parts: FittingPart[] = [];
  const faces: FittingFace[] = [];
  if (!lock) return { parts, faces };
  const add = (
    part: FittingPart,
    side: GripSide,
    face?: FittingFace["kind"],
    at: readonly [number, number] = lock.hole,
  ) => {
    parts.push(part);
    if (!face) return;
    const out = faceOf(door, side);
    faces.push({
      kind: face,
      center: [at[0], at[1], out * (door.thickness / 2 + part.size[2])],
      out,
    });
  };
  const sides = ["inner", "outer"] as const;
  if (door.fitting === "rosettes")
    for (const side of sides) {
      add(disc(door, side, "rose", lock.spindle, ROSE), side);
      add(disc(door, side, "key rosette", lock.hole, ROSE), side, "keyhole");
    }
  else if (door.grips.some((g) => g.side === "outer" && g.shape === "bar")) {
    add(plate(door, "inner"), "inner", "cylinder");
    add(
      disc(door, "outer", "cylinder rosette", lock.hole, CYLINDER_ROSETTE),
      "outer",
      "cylinder",
    );
  } else for (const side of sides) add(plate(door, side), side, "cylinder");
  if (door.viewer)
    for (const side of sides)
      add(
        disc(door, side, "viewer", [door.width / 2, VIEWER.height], {
          radius: VIEWER.cap,
          thickness: VIEWER.depth[side],
        }),
        side,
        side === "outer" ? "lens" : "eyepiece",
        [door.width / 2, VIEWER.height],
      );
  return { parts, faces };
};

const solidOfPart = (door: Door, angle: number, part: FittingPart): Obb =>
  obb(part.name, doorFrame(door, angle), part.size, part.center);

const mountThickness = (door: Door, side: GripSide) =>
  door.fitting === "rosettes" ? ROSE.thickness : PLATE.thickness[side];

const mountOf = (door: Door, angle: number, side: GripSide): Obb => {
  const name = `${door.name} ${side} ${door.fitting === "rosettes" ? "rose" : "plate"}`;
  return solidOfPart(
    door,
    angle,
    fittingsOf(door).parts.find((p) => p.name === name)!,
  );
};

export const viewerLens = (door: Door): Vector3 =>
  new Vector3(
    door.width / 2,
    VIEWER.height,
    faceOf(door, "outer") *
      (door.thickness / 2 + VIEWER.depth.outer + VIEWER.eye),
  ).applyMatrix4(doorFrame(door, 0));

export const leverParts = (
  door: Door,
  angle: number,
  side: GripSide,
  press = 0,
) => {
  const grip = door.grips.find((g) => g.side === side && g.shape === "lever");
  if (!grip) throw new Error(`${door.name} has no ${side} lever`);
  const [x, y, z] = leverPivot(grip);
  const base = Math.sign(z) * (door.thickness / 2 + mountThickness(door, side));
  return {
    bar: solidOf(door, angle, grip, press),
    neck: obb(
      `${door.name} ${side} lever neck`,
      doorFrame(door, angle),
      [2 * LEVER.radius, 2 * LEVER.radius, Math.abs(z - base)],
      [x, y, (z + base) / 2],
    ),
    mount: mountOf(door, angle, side),
    elbow: obb(
      `${door.name} ${side} lever elbow`,
      doorFrame(door, angle),
      [
        LEVER.bend + 2 * LEVER.radius,
        2 * LEVER.radius,
        LEVER.bend + 2 * LEVER.radius,
      ],
      [x - LEVER.bend / 2, y, z - (Math.sign(z) * LEVER.bend) / 2],
    ),
  };
};

const postsOf = (door: Door, angle: number, grip: Grip): Obb[] => {
  const face = (Math.sign(grip.center[2]) * door.thickness) / 2;
  const back = grip.center[2] - (Math.sign(grip.center[2]) * grip.size[2]) / 2;
  return [1, -1].map((end, i) =>
    obb(
      `${door.name} bar post ${i + 1}`,
      doorFrame(door, angle),
      [POST.size, POST.size, Math.abs(back - face)],
      [
        grip.center[0],
        grip.center[1] + end * (grip.size[1] / 2 - POST.inset),
        (back + face) / 2,
      ],
    ),
  );
};

export const fittingSolids = (door: Door, angle: number): Obb[] =>
  fittingsOf(door).parts.map((part) => solidOfPart(door, angle, part));

export const gripSolids = (door: Door, angle: number, press = 0): Obb[] =>
  door.grips.flatMap((grip) => {
    if (grip.shape === "bar")
      return [solidOf(door, angle, grip, press), ...postsOf(door, angle, grip)];
    if (grip.shape !== "lever") return [solidOf(door, angle, grip, press)];
    const { bar, neck, elbow } = leverParts(door, angle, grip.side, press);
    return [bar, neck, elbow];
  });

export const doorSolids = (door: Door, angle: number, press = 0): Obb[] => [
  doorLeaf(door, angle),
  ...gripSolids(door, angle, press),
  ...fittingSolids(door, angle),
];

export const coastTime = (pull: readonly [number, number], from: number, to: number) =>
  (pull[1] - pull[0]) * ((to - from) / from);

export const pulledThenCoasting = (
  t: number,
  pull: readonly [number, number],
  cracked: number,
  open: number,
) => {
  if (t <= pull[0]) return 0;
  if (t <= pull[1]) return cracked * ((t - pull[0]) / (pull[1] - pull[0])) ** 2;
  const s = Math.min(1, (t - pull[1]) / coastTime(pull, cracked, open));
  return cracked + (open - cracked) * (1 - (1 - s) ** 2);
};
