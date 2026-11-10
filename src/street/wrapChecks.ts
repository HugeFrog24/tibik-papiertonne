import { CylinderGeometry } from "three";
import { faceAngle, wrapGeometry, type Faceted, type Wrap } from "./wraps";

export const wrapGaps = (pole: Faceted, wrap: Wrap) => {
  const face = faceAngle(pole);
  const { args, y } = wrapGeometry(pole, wrap);
  const geometry = new CylinderGeometry(...args);
  const position = geometry.getAttribute("position");
  const gaps: number[] = [];
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const height = position.getY(i) + y;
    const phi = (Math.atan2(x, z) + 2 * Math.PI) % (2 * Math.PI);
    const centre = (Math.floor(phi / face) + 0.5) * face;
    const across = Math.hypot(x, z) * Math.cos(phi - centre);
    gaps.push(across - pole.radiusAt(height) * Math.cos(face / 2));
  }
  geometry.dispose();
  return gaps;
};

export const overlapping = (pole: Faceted, a: Wrap, b: Wrap) => {
  const span = (w: Wrap) =>
    new Set(
      Array.from({ length: w.faces }, (_, k) => (w.face + k) % pole.segments),
    );
  const sameFaces = [...span(a)].some((f) => span(b).has(f));
  return (
    sameFaces &&
    a.bottom < b.bottom + b.height &&
    b.bottom < a.bottom + a.height
  );
};
