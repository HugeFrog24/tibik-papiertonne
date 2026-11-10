import { ExtrudeGeometry, Shape, Vector2 } from "three";

export type Outline = readonly (readonly [number, number])[];
export type Bevel = { readonly size: number; readonly thickness: number };

export const shapeOf = (outline: Outline) =>
  new Shape(outline.map(([x, y]) => new Vector2(x, y)));

export const centeredPrism = (outline: Outline, width: number) =>
  new ExtrudeGeometry(shapeOf(outline), {
    depth: width,
    bevelEnabled: false,
  }).translate(0, 0, -width / 2);

export const roundedSlab = (
  outline: Outline,
  width: number,
  bevel: Bevel,
  grow = 0,
) => {
  const depth = width - 2 * bevel.thickness;
  const geometry = new ExtrudeGeometry(shapeOf(outline), {
    depth,
    bevelEnabled: true,
    bevelSize: bevel.size,
    bevelThickness: bevel.thickness + grow,
    bevelOffset: grow - bevel.size,
    bevelSegments: 3,
    curveSegments: 1,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
};

export const inkedSlab = (
  outline: Outline,
  width: number,
  bevel: Bevel,
  ink: number,
) => ({
  solid: roundedSlab(outline, width, bevel),
  hull: roundedSlab(outline, width, bevel, ink),
});
