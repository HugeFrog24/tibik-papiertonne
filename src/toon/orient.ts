import { Euler, Matrix4, Quaternion, Vector3 } from "three";

export const eulerFromBasis = (x: Vector3, y: Vector3, z: Vector3) =>
  new Euler().setFromRotationMatrix(new Matrix4().makeBasis(x, y, z));

export const blendMatrices = (a: Matrix4, b: Matrix4, k: number) => {
  if (k <= 0) return a;
  if (k >= 1) return b;
  const [pa, qa, pb, qb] = [
    new Vector3(),
    new Quaternion(),
    new Vector3(),
    new Quaternion(),
  ];
  a.decompose(pa, qa, new Vector3());
  b.decompose(pb, qb, new Vector3());
  return new Matrix4().compose(
    pa.lerp(pb, k),
    qa.slerp(qb, k),
    new Vector3(1, 1, 1),
  );
};

export const blendThrough = (a: Matrix4, via: Matrix4, b: Matrix4, k: number) =>
  k < 0.5 ? blendMatrices(a, via, 2 * k) : blendMatrices(via, b, 2 * k - 1);
