import { useDisposable } from "../toon/useDisposable";
import { BufferGeometry, Color, DoubleSide, Float32BufferAttribute, Vector3 } from "three";
import { LAMP_LIGHT } from "../street/lamps";
import { NO_INK } from "../toon/inkWidth";
import type { Vec3 } from "../toon/primitives";
import type { Drop } from "./rainDrops";
import type { WeatherLook } from "./overcast";
import { rainLight, type RainLight } from "./rainLight";
import { ribbon, streakOpacity } from "./rainStreaks";

const STREAK = "#dfe6ec";
const RING = 8;
const RING_LIFT = 0.003;

const STREAK_RGB = new Color(STREAK);
const LAMP_RGB = new Color(LAMP_LIGHT);
const STREAK_OPACITY = 0.65;
const RING_OPACITY = 0.5;
export const RAIN_RIBBONS = { renderOrder: 1 } as const;

type Segment = { readonly from: Vec3; readonly to: Vec3; readonly colour: readonly number[] };

const tinted = ({ level, warmth }: RainLight, opacity: number) => {
  const c = STREAK_RGB.clone().lerp(LAMP_RGB, warmth);
  return [c.r, c.g, c.b, opacity * level];
};

const ringSegments = (at: Vec3, age: number, colour: readonly number[]): Segment[] => {
  const [x, y, z] = at;
  const r = 0.02 + 0.3 * age;
  const point = (k: number): Vec3 => {
    const a = (2 * Math.PI * k) / RING;
    return [x + r * Math.cos(a), y + RING_LIFT, z + r * Math.sin(a)];
  };
  return Array.from({ length: RING }, (_, k) => ({ from: point(k), to: point(k + 1), colour }));
};

const segmentsOf = (drops: readonly Drop[], light: (p: Vec3) => RainLight): Segment[] =>
  drops.flatMap((d) => {
    const lit = light(d.splash ? d.splash.at : d.head);
    if (lit.level === 0) return [];
    if (d.splash) return ringSegments(d.splash.at, d.splash.age, tinted(lit, RING_OPACITY));
    return [{ from: d.tail, to: d.head, colour: tinted(lit, STREAK_OPACITY * (d.fade ?? 1)) }];
  });

const ribbonGeometry = (segments: readonly Segment[], eye: Vec3, fov: number) => {
  const positions: number[] = [];
  const colours: number[] = [];
  const index: number[] = [];
  const lens = new Vector3(...eye);
  segments.forEach(({ from, to, colour }, i) => {
    const faint = streakOpacity(lens.distanceTo(new Vector3(...to)), fov);
    for (const corner of ribbon(from, to, eye, fov)) {
      positions.push(...corner);
      colours.push(colour[0], colour[1], colour[2], colour[3] * faint);
    }
    const o = 4 * i;
    index.push(o, o + 1, o + 2, o, o + 2, o + 3);
  });
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colours, 4));
  geometry.setIndex(index);
  return geometry;
};

export const Rain: React.FC<{
  readonly drops: readonly Drop[];
  readonly eye: Vec3;
  readonly fov: number;
  readonly look: WeatherLook;
  readonly lampsOn: boolean;
}> = ({ drops, eye, fov, look, lampsOn }) => {
  const geometry = useDisposable(() => ribbonGeometry(segmentsOf(drops, rainLight(look, lampsOn)), eye, fov), [drops, look, lampsOn, eye, fov]);
  return (
    <mesh geometry={geometry} userData={NO_INK} renderOrder={RAIN_RIBBONS.renderOrder}>
      <meshBasicMaterial vertexColors transparent depthWrite={false} side={DoubleSide} />
    </mesh>
  );
};
