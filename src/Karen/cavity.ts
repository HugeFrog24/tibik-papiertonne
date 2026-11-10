import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Matrix4,
  Quaternion,
  Vector3,
} from "three";
import { obb, type Obb } from "../physics/collision";
import type { Vec3 } from "../toon/primitives";
import { MOUTH, mouthBottom, mouthHalfWidth, mouthTop } from "./face";
import { faceAlign, facePoint } from "./headShape";

export const CAVITY = {
  minOpen: MOUTH.minOpen,
  depth: 0.05,
  rim: 0.002,
  under: 0.001,
  columns: 25,
  rows: 14,
  roundness: 0.3,
  lip: 0.007,
  behind: 0.008,
  colours: { lips: "#5c1a27", throat: "#13040a" },
};

export const TEETH = {
  gap: 0.0018,
  hidden: 0.004,
  setback: { upper: 0.0045, lower: 0.0125 },
  arch: 0.008,
  jaw: 0.058,
  colours: { front: "#f3ead3", back: "#d3c7ab" },
  ink: 0.0009,
};

export const TONGUE = {
  size: [0.03, 0.008, 0.012] as Vec3,
  below: 0.2,
  behind: 0.0015,
  colour: "#c86872",
  ink: 0.0015,
};

type ToothShape = {
  readonly name: string;
  readonly width: number;
  readonly height: number;
  readonly depth: number;
};

const UPPER: readonly ToothShape[] = [
  { name: "central incisor", width: 0.0135, height: 0.0159, depth: 0.0045 },
  { name: "lateral incisor", width: 0.011, height: 0.0139, depth: 0.0045 },
  { name: "canine", width: 0.0115, height: 0.0146, depth: 0.0055 },
  { name: "first premolar", width: 0.0105, height: 0.0095, depth: 0.006 },
  { name: "second premolar", width: 0.0105, height: 0.009, depth: 0.006 },
];

const LOWER: readonly ToothShape[] = [
  { name: "central incisor", width: 0.0095, height: 0.0105, depth: 0.0045 },
  { name: "lateral incisor", width: 0.0095, height: 0.0105, depth: 0.0045 },
  { name: "canine", width: 0.0105, height: 0.0115, depth: 0.0055 },
  { name: "first premolar", width: 0.0105, height: 0.0095, depth: 0.006 },
  { name: "second premolar", width: 0.0105, height: 0.009, depth: 0.006 },
];

export type Tooth = {
  readonly name: string;
  readonly row: "upper" | "lower";
  readonly side: 1 | -1;
  readonly index: number;
  readonly center: Vector3;
  readonly size: Vec3;
  readonly rotation: Quaternion;
  readonly shade: number;
};

const profile = (u: number) => Math.sqrt(Math.max(0, 1 - u * u));

export const pocketAt = (open: number) => {
  const width = mouthHalfWidth(open) + CAVITY.rim;
  const points: Vector3[][] = [];
  const shade: number[][] = [];
  for (let i = 0; i < CAVITY.columns; i++) {
    const u = -1 + (2 * i) / (CAVITY.columns - 1);
    const k = profile(u);
    const top = mouthTop(u, open) + CAVITY.rim;
    const bottom = mouthBottom(u, open) - CAVITY.rim;
    const upper = top + CAVITY.behind * k;
    const lower = bottom - CAVITY.behind * k;
    const section: [number, number][] = [
      [top, 0],
      ...Array.from({ length: CAVITY.rows + 1 }, (_, j): [number, number] => {
        const s = j / CAVITY.rows;
        const deep = Math.sin(Math.PI * s) ** CAVITY.roundness;
        return [
          upper + (lower - upper) * s,
          k * (CAVITY.lip + (CAVITY.depth - CAVITY.lip) * deep),
        ];
      }),
      [bottom, 0],
    ];
    const column: Vector3[] = [];
    const tone: number[] = [];
    for (const [y, depth] of section) {
      const p = facePoint(u * width, y, -CAVITY.under);
      p.z -= depth;
      column.push(p);
      tone.push(depth / CAVITY.depth);
    }
    points.push(column);
    shade.push(tone);
  }
  return { points, shade };
};

const JAW_AT = mouthTop(0, 0);

const jawShift = (open: number) =>
  facePoint(0, JAW_AT - TEETH.jaw * open, 0).sub(facePoint(0, JAW_AT, 0));

const rowOf = (
  row: "upper" | "lower",
  shapes: readonly ToothShape[],
  open: number,
): Tooth[] => {
  const width = mouthHalfWidth(0);
  let from = TEETH.gap / 2;
  return shapes.flatMap((shape, index) => {
    const x = from + shape.width / 2;
    from += shape.width + TEETH.gap;
    const u = x / width;
    const y =
      row === "upper"
        ? mouthTop(u, 0) + TEETH.hidden - shape.height / 2
        : mouthTop(u, 0) - TEETH.hidden + shape.height / 2;
    const back = TEETH.setback[row] + TEETH.arch * u * u + shape.depth / 2;
    const drop = row === "lower" ? jawShift(open) : new Vector3();
    return ([1, -1] as const).map((side) => ({
      name: `${row} ${side === 1 ? "left" : "right"} ${shape.name}`,
      row,
      side,
      index,
      center: facePoint(side * x, y, -back).add(drop),
      size: [shape.width, shape.height, shape.depth] as Vec3,
      rotation: faceAlign(side * x, y).multiply(
        new Quaternion().setFromAxisAngle(
          new Vector3(0, 1, 0),
          side * Math.atan((2 * TEETH.arch * x) / (width * width)),
        ),
      ),
      shade: index / (shapes.length - 1),
    }));
  });
};

export const teethAt = (open: number): Tooth[] => [
  ...rowOf("upper", UPPER, open),
  ...rowOf("lower", LOWER, open),
];

export const toothObb = (tooth: Tooth): Obb =>
  obb(
    tooth.name,
    new Matrix4().compose(tooth.center, tooth.rotation, new Vector3(1, 1, 1)),
    tooth.size,
  );

export const tongueAt = (open: number) => {
  const front = teethAt(open).filter((t) => t.row === "lower" && t.index === 0);
  const middle = front
    .reduce((sum, t) => sum.add(t.center), new Vector3())
    .divideScalar(front.length);
  const tip = middle.y + LOWER[0].height / 2;
  return {
    center: new Vector3(
      0,
      tip - TONGUE.below * TONGUE.size[1],
      middle.z - LOWER[0].depth / 2 - TONGUE.behind - TONGUE.size[2],
    ),
    size: TONGUE.size,
  };
};

const LIPS = new Color(CAVITY.colours.lips);
const THROAT = new Color(CAVITY.colours.throat);

export const pocketGeometry = (open: number) => {
  const { points, shade } = pocketAt(open);
  const rows = points[0].length;
  const positions: number[] = [];
  const colours: number[] = [];
  points.forEach((column, i) => { column.forEach((p, j) => {
      positions.push(p.x, p.y, p.z);
      const c = LIPS.clone().lerp(THROAT, Math.min(1, shade[i][j]));
      colours.push(c.r, c.g, c.b);
    }); },
  );
  const index: number[] = [];
  for (let i = 0; i + 1 < points.length; i++)
    for (let j = 0; j + 1 < rows; j++) {
      const a = i * rows + j;
      index.push(a, a + 1, a + rows, a + 1, a + rows + 1, a + rows);
    }
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(positions, 3));
  g.setAttribute("color", new Float32BufferAttribute(colours, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  const normals = g.getAttribute("normal");
  for (let i = 0; i < normals.count; i++) {
    if (Math.hypot(normals.getX(i), normals.getY(i), normals.getZ(i)) > 1e-9)
      continue;
    const from = i + 1 < normals.count ? i + 1 : i - 1;
    normals.setXYZ(
      i,
      normals.getX(from),
      normals.getY(from),
      normals.getZ(from),
    );
  }
  return g;
};
