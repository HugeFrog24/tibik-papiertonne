import { PlaneGeometry } from "three";

export const bentPlane = (
  [w, h]: readonly [number, number],
  [across, down]: readonly [number, number],
  height: (x: number, y: number) => number,
  back = false,
) => {
  const g = new PlaneGeometry(w, h, across, down);
  g.translate(w / 2, h / 2, 0);
  const p = g.getAttribute("position");
  for (let i = 0; i < p.count; i++) p.setZ(i, height(p.getX(i), p.getY(i)));
  if (back) {
    const index = g.getIndex()!;
    for (let k = 0; k < index.count; k += 3) {
      const second = index.getX(k + 1);
      index.setX(k + 1, index.getX(k + 2));
      index.setX(k + 2, second);
    }
    index.needsUpdate = true;
  }
  g.computeVertexNormals();
  return g;
};
