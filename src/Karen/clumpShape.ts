import { BufferGeometry, Float32BufferAttribute } from "three";

export const CLUMP = {
  rows: 18,
  around: 12,
  width: 0.9,
  curl: 0.12,
  root: 0.94,
  tip: 0.985,
  taper: 0.65,
};

const cache = new Map<number, BufferGeometry>();

export const clumpGeometry = (rootSign: 1 | -1): BufferGeometry => {
  const cached = cache.get(rootSign);
  if (cached) return cached;
  const { rows, around, width, curl, root, tip, taper } = CLUMP;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= rows; i++) {
    const u = i / rows;
    const y = rootSign * (root - (root + tip) * u);
    const span = Math.sqrt(Math.max(0, 1 - y * y));
    const bulge = curl * Math.sin(Math.PI * u);
    const r = Math.max(0, span - bulge) * width * (1 - u) ** taper;
    for (let j = 0; j <= around; j++) {
      const a = (j / around) * 2 * Math.PI;
      positions.push(r * Math.cos(a), y, bulge + r * Math.sin(a));
      uvs.push(j / around, u);
    }
  }
  const ring = around + 1;
  for (let i = 0; i < rows; i++)
    for (let j = 0; j < around; j++) {
      const a = i * ring + j;
      const b = a + ring;
      if (rootSign > 0) indices.push(a, a + 1, b, a + 1, b + 1, b);
      else indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  const centre = positions.length / 3;
  positions.push(0, rootSign * root, 0);
  uvs.push(0.5, 0);
  for (let j = 0; j < around; j++)
    if (rootSign > 0) indices.push(centre, j + 1, j);
    else indices.push(centre, j, j + 1);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  cache.set(rootSign, geometry);
  return geometry;
};
