import { Vector3, type BufferGeometry } from "three";

export type Face = {
  readonly a: Vector3;
  readonly b: Vector3;
  readonly c: Vector3;
  readonly normal: Vector3;
};

export const faces = (geometry: BufferGeometry): Face[] => {
  const position = geometry.getAttribute("position");
  const index = geometry.getIndex()!;
  const p = (k: number) =>
    new Vector3().fromBufferAttribute(position, index.getX(k));
  const out: Face[] = [];
  for (let k = 0; k < index.count; k += 3) {
    const [a, b, c] = [p(k), p(k + 1), p(k + 2)];
    const normal = b.clone().sub(a).cross(c.clone().sub(a));
    if (normal.lengthSq() < 1e-14) continue;
    out.push({ a, b, c, normal });
  }
  return out;
};
