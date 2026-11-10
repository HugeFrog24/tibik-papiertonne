import type { Vec3 } from "../toon/primitives";

export type Relaxing = { readonly offset: Vec3; readonly speed: Vec3 };

const HALVED_AT = 1.6783469900166608;
export const AT_REST = { offset: 1e-4, speed: 1e-3 };

const axis = (offset: number, speed: number, dt: number, halfLife: number) => {
  const rate = HALVED_AT / halfLife;
  const pull = speed + offset * rate;
  const fade = Math.exp(-rate * dt);
  const [x, v] = [fade * (offset + pull * dt), fade * (speed - pull * rate * dt)];
  return Math.abs(x) < AT_REST.offset && Math.abs(v) < AT_REST.speed ? [0, 0] : [x, v];
};

export const relaxed = ({ offset, speed }: Relaxing, dt: number, halfLife: number): Relaxing => {
  const axes = offset.map((x, i) => axis(x, speed[i], dt, halfLife));
  return { offset: axes.map(([x]) => x) as unknown as Vec3, speed: axes.map(([, v]) => v) as unknown as Vec3 };
};
