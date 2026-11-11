import { decibelGain, easeUnit } from "../characters/scalar";
import type { Line } from "../dialogue/line";
import { spokenSpans } from "../dialogue/voiced";
import { lazy } from "../physics/lazy";
import type { Language } from "../language";
import { STEADY, type SceneClock } from "../sceneClock";

export const DUCK = { floor: decibelGain(-8), attack: 0.15, release: 0.5, bridge: 1 };

type Span = readonly [number, number];

const bridged = (spans: readonly Span[]) =>
  [...spans]
    .sort((a, b) => a[0] - b[0])
    .reduce<Span[]>((out, span) => {
      const last = out.at(-1);
      return last && span[0] - last[1] < DUCK.bridge ? [...out.slice(0, -1), [last[0], Math.max(last[1], span[1])]] : [...out, span];
    }, []);

export const duckUnder = (spans: readonly Span[]) => {
  const joined = bridged(spans);
  return (t: number): number => {
    const depth = Math.max(0, ...joined.map(([from, to]) => Math.min(easeUnit((t - from + DUCK.attack) / DUCK.attack), easeUnit((to + DUCK.release - t) / DUCK.release))));
    return 1 - (1 - DUCK.floor) * depth;
  };
};

export const duckUnderLines = (scene: string, lines: () => readonly Line[], beats: () => readonly Span[] = () => [], language: Language = "de", clock: SceneClock = STEADY) => {
  const duck = lazy(() => {
    const all = lines();
    return duckUnder([...all.map(spokenSpans(scene, all, language, clock)), ...beats().map(([from, to]): Span => [clock.editAt(from), clock.editAt(to)])]);
  });
  return (t: number) => duck()(t);
};
