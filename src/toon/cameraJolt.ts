import { random } from "remotion";
import { Vector3 } from "three";
import { WORLD_UP, type Vec3 } from "./primitives";
import type { CameraSetup } from "./shots";

export type Jolt = { readonly at: number; readonly strength: number };

export const JOLT = { hertz: 9, decay: 0.05, lasts: 0.3, lift: 0.01, turn: (0.3 * Math.PI) / 180 };

const bump = (since: number) =>
  since < 0 || since > JOLT.lasts ? 0 : Math.exp(-since / JOLT.decay) * Math.sin(2 * Math.PI * JOLT.hertz * since);

const PEAK = Math.max(...Array.from({ length: 300 }, (_, i) => bump((i * JOLT.lasts) / 300)));

const spread = (jolt: Jolt, axis: string) => random(`jolt-${jolt.at}-${axis}`) * 2 - 1;

export const joltAt = (t: number, jolts: readonly Jolt[]) =>
  jolts.reduce(
    (sum, jolt) => {
      const k = (jolt.strength * bump(t - jolt.at)) / PEAK;
      if (k === 0) return sum;
      const way = new Vector3(0.35 * spread(jolt, "x"), 1, 0.25 * spread(jolt, "z")).normalize();
      return {
        shift: sum.shift.addScaledVector(way, k * JOLT.lift),
        pitch: sum.pitch + k * JOLT.turn * (0.7 + 0.3 * spread(jolt, "pitch")),
        roll: sum.roll + k * JOLT.turn * 0.5 * spread(jolt, "roll"),
      };
    },
    { shift: new Vector3(), pitch: 0, roll: 0 },
  );

export const jolted =
  (at: (t: number) => CameraSetup, jolts: readonly Jolt[]) =>
  (t: number): CameraSetup => {
    const base = at(t);
    const { shift, pitch, roll } = joltAt(t, jolts);
    if (shift.lengthSq() === 0 && pitch === 0 && roll === 0) return base;
    const from = new Vector3(...base.position);
    const view = new Vector3(...base.target).sub(from);
    const ahead = view.clone().normalize();
    const side = ahead.clone().cross(new Vector3(...(base.up ?? WORLD_UP))).normalize();
    view.applyAxisAngle(side, pitch);
    const up = side.clone().cross(view).normalize().applyAxisAngle(view.clone().normalize(), roll);
    const position = from.add(shift);
    return {
      ...base,
      position: position.toArray() as Vec3,
      target: position.clone().add(view).toArray() as Vec3,
      up: up.toArray() as Vec3,
    };
  };
