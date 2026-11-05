import { useDisposable } from "../toon/useDisposable";
import { BufferGeometry, Color, Float32BufferAttribute } from "three";
import { LAMP_LIGHT } from "../street/lamps";
import type { Vec3 } from "../toon/primitives";
import type { Drop } from "./rainDrops";
import { FULL_DAYLIGHT, type RainLight } from "./rainLight";

const STREAK = "#dfe6ec";
const RING = 8;
const RING_LIFT = 0.003;

const STREAK_RGB = new Color(STREAK);
const LAMP_RGB = new Color(LAMP_LIGHT);
const STREAK_OPACITY = 0.65;
const RING_OPACITY = 0.5;

const tinted = ({ level, warmth }: RainLight, opacity: number) => {
  const c = STREAK_RGB.clone().lerp(LAMP_RGB, warmth);
  return [c.r, c.g, c.b, opacity * level];
};

const streakGeometry = (drops: readonly Drop[], light: (p: Vec3) => RainLight) => {
  const positions: number[] = [];
  const colours: number[] = [];
  for (const d of drops) {
    if (d.splash) continue;
    const lit = light(d.head);
    if (lit.level === 0) continue;
    positions.push(...d.tail, ...d.head);
    const colour = tinted(lit, STREAK_OPACITY * (d.fade ?? 1));
    colours.push(...colour, ...colour);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colours, 4));
  return geometry;
};

const ringGeometry = (drops: readonly Drop[], light: (p: Vec3) => RainLight) => {
  const positions: number[] = [];
  const colours: number[] = [];
  for (const d of drops) {
    if (!d.splash) continue;
    const lit = light(d.splash.at);
    if (lit.level === 0) continue;
    const colour = tinted(lit, RING_OPACITY);
    const [x, y, z] = d.splash.at;
    const r = 0.02 + 0.3 * d.splash.age;
    for (let k = 0; k < RING; k++) {
      const a = (2 * Math.PI * k) / RING;
      const b = (2 * Math.PI * (k + 1)) / RING;
      positions.push(
        x + r * Math.cos(a),
        y + RING_LIFT,
        z + r * Math.sin(a),
        x + r * Math.cos(b),
        y + RING_LIFT,
        z + r * Math.sin(b),
      );
      colours.push(...colour, ...colour);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colours, 4));
  return geometry;
};

export const Rain: React.FC<{ readonly drops: readonly Drop[]; readonly light?: (p: Vec3) => RainLight }> = ({
  drops,
  light = FULL_DAYLIGHT,
}) => {
  const streaks = useDisposable(() => streakGeometry(drops, light), [drops, light]);
  const rings = useDisposable(() => ringGeometry(drops, light), [drops, light]);
  return (
    <>
      <lineSegments geometry={streaks}>
        <lineBasicMaterial vertexColors transparent />
      </lineSegments>
      <lineSegments geometry={rings}>
        <lineBasicMaterial vertexColors transparent />
      </lineSegments>
    </>
  );
};
