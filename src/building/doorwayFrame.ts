import { boundsPart, type Part } from "../street/building";

export const DOOR_FRAME = { lining: 0.022, head: 0.038, casing: 0.06, trim: 0.01 };

export type Doorway = { readonly x0: number; readonly x1: number; readonly height: number };

type Span = readonly [number, number];

export const doorwayFrameParts = (
  doorway: Doorway,
  floor: number,
  reveal: Span,
  faces: readonly (readonly [string, Span])[],
): readonly Part[] => {
  const { x0, x1, height } = doorway;
  const { lining, head, casing } = DOOR_FRAME;
  const latch = x0 + lining;
  const hinge = x1 - lining;
  const top = height - head;
  const up = ([a, b]: Span): Span => [floor + a, floor + b];
  const casings = ([face, z]: readonly [string, Span]) => [
    boundsPart(`${face} latch casing`, [latch - casing, latch], up([0, top]), z),
    boundsPart(`${face} hinge casing`, [hinge, hinge + casing], up([0, top]), z),
    boundsPart(`${face} head casing`, [latch - casing, hinge + casing], up([top, top + casing]), z),
  ];
  return [
    boundsPart("latch lining", [x0, latch], up([0, height]), reveal),
    boundsPart("hinge lining", [hinge, x1], up([0, height]), reveal),
    boundsPart("head lining", [latch, hinge], up([top, height]), reveal),
    ...faces.flatMap(casings),
  ];
};
