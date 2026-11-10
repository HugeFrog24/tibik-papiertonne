import { Vector2 } from "three";

export const taperedProfile = (top: number, bottom: number, length: number, steps: number): Vector2[] => {
  const tangent = Math.asin((top - bottom) / length);
  const arc = (radius: number, centre: number, from: number, to: number) =>
    Array.from({ length: steps + 1 }, (_, i) => {
      const angle = from + ((to - from) * i) / steps;
      return new Vector2(Math.max(0, radius * Math.cos(angle)), centre + radius * Math.sin(angle));
    });
  return [...arc(top, 0, Math.PI / 2, -tangent), ...arc(bottom, -length, -tangent, -Math.PI / 2)];
};
