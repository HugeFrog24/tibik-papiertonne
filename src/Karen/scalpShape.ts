import { BufferGeometry, Float32BufferAttribute } from "three";
import { easeUnit } from "../characters/scalar";

export const SCALP = { around: 48, rows: 16, lift: 1.035, beyond: 0.08 };

export const hairlinePolar = (azimuth: number) =>
  0.55 + 0.75 * easeUnit((Math.abs(azimuth) - 0.45) / 1.0);

let cached: BufferGeometry | null = null;

export const scalpGeometry = (): BufferGeometry => {
  if (cached) return cached;
  const { around, rows, beyond } = SCALP;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let j = 0; j <= around; j++) {
    const azimuth = -Math.PI + (j / around) * 2 * Math.PI;
    const edge = hairlinePolar(azimuth) + beyond;
    for (let i = 0; i <= rows; i++) {
      const polar = (i / rows) * edge;
      positions.push(
        Math.sin(polar) * Math.sin(azimuth),
        Math.cos(polar),
        Math.sin(polar) * Math.cos(azimuth),
      );
    }
  }
  const column = rows + 1;
  for (let j = 0; j < around; j++)
    for (let i = 0; i < rows; i++) {
      const a = j * column + i;
      const b = a + column;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  cached = geometry;
  return geometry;
};
