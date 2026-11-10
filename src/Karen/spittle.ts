import { Vector3 } from "three";
import { random } from "remotion";
import { contacts, sphere, type Solid } from "../physics/collision";
import { SPRAY, coneDirection, type Burst, type Emitter } from "./spray";

export const SPITTLE = {
  spikes: 6,
  cone: 0.6,
  length: [0.03, 0.05] as const,
  life: 1 / 6,
  shoot: 0.35,
  thin: 0.45,
  radius: 0.0024,
  bead: 0.0045,
  step: 0.002,
  open: 0.3,
};

export type Spike = {
  readonly id: string;
  readonly burst: string;
  readonly from: Vector3;
  readonly to: Vector3;
  readonly radius: number;
  readonly bead: number;
};

export const loudestOf = (bursts: readonly Burst[]) =>
  bursts.filter((b) => b.count >= SPRAY.strengths.strong);

const freeLength = (
  origin: Vector3,
  dir: Vector3,
  length: number,
  solids: readonly Solid[],
) => {
  for (let s = SPITTLE.step; s <= length; s += SPITTLE.step)
    if (
      contacts(
        [sphere("spittle", origin.clone().addScaledVector(dir, s), SPITTLE.bead)],
        solids,
      ).length
    )
      return s - SPITTLE.step;
  return length;
};

const easeOut = (x: number) => 1 - (1 - x) ** 2;

export const spittleAt = (
  loud: readonly Burst[],
  t: number,
  emitterAt: (t: number) => Emitter,
  solidsAt: (t: number) => readonly Solid[],
): Spike[] =>
  loud.flatMap((burst) => {
    const p = (t - burst.at) / SPITTLE.life;
    if (p < 0 || p >= 1) return [];
    const emitter = emitterAt(t);
    const { origin, open } = emitter;
    if (open < SPITTLE.open) return [];
    const solids = solidsAt(t);
    return Array.from({ length: SPITTLE.spikes }, (_, k): Spike[] => {
      const r = (key: string) => random(`${burst.seed}/spittle/${k}/${key}`);
      const around = Math.PI + (Math.PI * k) / (SPITTLE.spikes - 1);
      const angle = SPITTLE.cone * (0.55 + 0.45 * r("angle"));
      const dir = coneDirection(emitter, angle, around).normalize();
      const [shortest, longest] = SPITTLE.length;
      const free = freeLength(
        origin,
        dir,
        shortest + (longest - shortest) * r("length"),
        solids,
      );
      if (free < 2 * SPITTLE.bead) return [];
      const reach = free * easeOut(Math.min(1, p / SPITTLE.shoot));
      const gone = free * Math.max(0, (p - SPITTLE.thin) / (1 - SPITTLE.thin));
      return [
        {
          id: `${burst.seed}/spittle/${k}`,
          burst: burst.seed,
          from: origin.clone().addScaledVector(dir, gone),
          to: origin.clone().addScaledVector(dir, reach),
          radius: SPITTLE.radius,
          bead: SPITTLE.bead,
        },
      ];
    }).flat();
  });
