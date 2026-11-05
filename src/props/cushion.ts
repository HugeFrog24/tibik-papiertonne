import { BoxGeometry } from "three";

export const cushionGeometry = ([w, h, d]: readonly [number, number, number], seam = 0.25, segments = 12) => {
  const g = new BoxGeometry(w, h, d, segments, 2, segments);
  const p = g.getAttribute("position");
  for (let i = 0; i < p.count; i++) {
    const nx = (2 * p.getX(i)) / w;
    const nz = (2 * p.getZ(i)) / d;
    const puff = Math.sqrt(Math.max(0, (1 - nx ** 4) * (1 - nz ** 4)));
    p.setY(i, p.getY(i) * (seam + (1 - seam) * puff));
  }
  g.computeVertexNormals();
  return g;
};
