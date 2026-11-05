import {
  allColliders,
  bodyColliders,
  type Placement,
} from "../characters/skeleton";
import type { Line } from "../dialogue/line";
import { atFrame } from "../frameRate";
import type { Obb, Solid } from "../physics/collision";
import { lazy } from "../physics/lazy";
import { memoByFrame } from "../physics/memoSolve";
import { asCharacter, type TibikFrame } from "../Tibik/character";
import { RIG } from "../Tibik/rig";
import { asKaren, type KarenFrame } from "./character";
import { karenMouthEmitter } from "./mouthEmitter";
import { loudestOf, spittleAt } from "./spittle";
import { KAREN_SKELETON } from "./rig";
import {
  burstsOf,
  landingOf,
  launchesOf,
  sprayFrame,
  type Flight,
  type SurfaceKind,
} from "./spray";

export type SprayScene = {
  readonly lines: readonly Line[];
  readonly karenAt: (t: number) => Placement & { readonly mouthOpen: number };
  readonly still: () => readonly Solid[];
  readonly moving: (t: number) => readonly Solid[];
  readonly people: (t: number) => readonly Solid[];
  readonly cardboard: (t: number) => readonly Obb[];
};

const isObb = (s: Solid): s is Obb => s.kind === "obb";

export const bothOf = (tibik: TibikFrame, karen: KarenFrame): Solid[] => {
  const her = bodyColliders(KAREN_SKELETON, asKaren(karen));
  return [
    ...allColliders(RIG, asCharacter(tibik)),
    ...her.torso,
    ...her.legs,
    ...her.leftArm,
    ...her.rightArm,
  ];
};

export const sceneSpray = (scene: SprayScene) => {
  const parts = memoByFrame((t: number) => {
    const moving = scene.moving(t);
    const people = scene.people(t);
    const cardboard = scene.cardboard(t);
    const boxes = [...moving, ...cardboard].filter(isObb);
    const counts = new Map<string, number>();
    for (const s of boxes) counts.set(s.name, (counts.get(s.name) ?? 0) + 1);
    return {
      all: [...scene.still(), ...moving, ...people, ...cardboard],
      people: new Set(people.map((s) => s.name)),
      cardboard: new Set(cardboard.map((s) => s.name)),
      followed: new Map(
        boxes
          .filter((s) => counts.get(s.name) === 1)
          .map((s) => [s.name, s] as const),
      ),
    };
  });
  const at = (t: number) => parts(atFrame(t));
  const targets = (t: number): readonly Solid[] => at(t).all;
  const emitterAt = (t: number) => karenMouthEmitter(scene.karenAt(atFrame(t)));
  const bursts = lazy(() => burstsOf(scene.lines));
  const loudest = lazy(() => loudestOf(bursts()));
  const spittle = (t: number) => spittleAt(loudest(), t, emitterAt, targets);
  const flights = lazy((): Flight[] =>
    launchesOf(bursts(), emitterAt).map((launch) => {
      const landing = landingOf(launch, targets);
      if (!landing) return { launch, landing, kind: "dries", follow: false };
      const then = at(landing.at);
      const kind: SurfaceKind = then.cardboard.has(landing.on)
        ? "stays"
        : then.people.has(landing.on)
          ? "none"
          : "dries";
      return { launch, landing, kind, follow: then.followed.has(landing.on) };
    }),
  );
  const surfaceAt = (name: string, t: number) => at(t).followed.get(name);
  return {
    flights,
    targets,
    surfaceAt,
    loudest,
    spittleAt: spittle,
    frameAt: (t: number) => sprayFrame(flights(), t, surfaceAt, spittle(t)),
  };
};
