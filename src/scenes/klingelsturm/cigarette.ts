import { Matrix4, Quaternion, Vector3 } from "three";
import { placeFrame, type PropPlace } from "../../characters/propPlace";
import { inWindow, round6 } from "../../characters/scalar";
import { torsoMatrix, type Placement } from "../../characters/skeleton";
import { karenMouthEmitter, SPRAY_AHEAD } from "../../Karen/mouthEmitter";
import { KAREN_SKELETON } from "../../Karen/rig";
import { cigaretteTip } from "../../props/cigaretteShape";
import { FLAME, LIGHTER } from "../../props/lighterShape";
import { EXIT } from "./exit";
import { PHONE_AT_POCKET } from "../../Karen/phoneShape";

const GONE = EXIT.end;
const at = (base: number, after: number) => round6(base + after);
const span = (base: number, from: number, to: number) => [at(base, from), at(base, to)] as const;

const mediumCut = at(GONE, 0.8);
const lighterGrip = at(mediumCut, 0.3);
const flick = at(lighterGrip, 0.3);
const flameOut = at(flick, 1.5);
const jumpCut = at(mediumCut, 4.3);
const outAgain = at(jumpCut, 1.4);

export const CODA = {
  phoneAway: span(GONE, 0, 0.5),
  mediumCut,
  lighterGrip,
  flick,
  flame: [flick, flameOut] as const,
  draws: [span(flick, 0.5, 0.8), span(flick, 1.0, 1.4)] as const,
  lit: at(flick, 0.6),
  lighterDown: span(flameOut, 0, 0.8),
  exhale: span(flameOut, 0.4, 1.9),
  jumpCut,
  laterDraw: span(jumpCut, 0.8, 1.7),
  outAgain,
  darkExhale: span(jumpCut, 1.9, 3.2),
  end: at(outAgain, 3.3),
};

export const BURN = { rate: 0.008 / 60 };
export const ASH = { hold: 0.008 };

export const burnedAt = (storyT: number) => (storyT < CODA.lit ? 0 : BURN.rate * (storyT - CODA.lit));

export const ashAt = (storyT: number) => Math.min(burnedAt(storyT), ASH.hold);

export const GLOW = { rest: 0.35, rise: 0.3, fall: 0.8, catch: 0.4 };

const DRAWS: readonly (readonly [number, number])[] = [...CODA.draws, CODA.laterDraw];

const drawingIn = ([from, to]: readonly [number, number], t: number) => {
  if (t < from) return 0;
  const peak = Math.min(1, (Math.min(t, to) - from) / GLOW.rise);
  return t <= to ? peak : Math.max(0, peak - (t - to) / GLOW.fall);
};

export const emberGlowAt = (t: number) =>
  t < CODA.lit
    ? 0
    : Math.min(1, (t - CODA.lit) / GLOW.catch) * (GLOW.rest + (1 - GLOW.rest) * Math.max(...DRAWS.map((d) => drawingIn(d, t))));

export const exhalingAt = (t: number) =>
  Math.max(...[CODA.exhale, CODA.darkExhale].map(([a, b]) => inWindow(t, [a, a + 0.2]) - inWindow(t, [b - 0.3, b])));

export const LIPS = { inside: 0.005, droop: 0.2, aside: -0.7, corner: 0.02, open: 0.08, exhale: 0.18 };

export const TO_HER_HAND = { turn: 0.45, nod: 0.1 };

export const turnedToHerHand = (t: number) =>
  inWindow(t, [CODA.phoneAway[1], CODA.mediumCut]) - inWindow(t, [CODA.flame[1], CODA.flame[1] + 0.4]);

export const lipsFrame = (karen: Placement & { readonly mouthOpen: number }) => {
  const { origin, forward, up } = karenMouthEmitter({ ...karen, mouthOpen: LIPS.open });
  const left = up.clone().cross(forward).normalize();
  const along = forward.clone().applyAxisAngle(left, LIPS.droop).applyAxisAngle(up, LIPS.aside).normalize();
  const x = up.clone().cross(along).normalize();
  const y = along.clone().cross(x).normalize();
  const filterEnd = origin
    .clone()
    .addScaledVector(forward, -(SPRAY_AHEAD + LIPS.inside))
    .addScaledVector(left, -LIPS.corner);
  return new Matrix4().makeBasis(x, y, along).setPosition(filterEnd);
};

const blendFrames = (a: Matrix4, b: Matrix4, k: number) => {
  if (k <= 0) return a;
  if (k >= 1) return b;
  const [pa, qa, pb, qb] = [new Vector3(), new Quaternion(), new Vector3(), new Quaternion()];
  a.decompose(pa, qa, new Vector3());
  b.decompose(pb, qb, new Vector3());
  return new Matrix4().compose(pa.lerp(pb, k), qa.slerp(qb, k), new Vector3(1, 1, 1));
};

export const inHerHands = (t: number) => t >= CODA.mediumCut;

export const cigaretteFrame = (karen: Placement & { readonly mouthOpen: number }): Matrix4 => lipsFrame(karen);

export const LIGHTER_LOW: PropPlace = { position: [-0.3, 0.52, 0.38], rotation: [0, 0, 0] };

export const lighterOut = (t: number) => t >= CODA.mediumCut && t <= CODA.lighterDown[1];

export const lightingAt = (t: number) =>
  inWindow(t, [CODA.flick - 0.1, CODA.flick]) - inWindow(t, [CODA.flame[1], CODA.flame[1] + 0.1]);

export const flameAmountAt = (t: number) =>
  inWindow(t, [CODA.flame[0], CODA.flame[0] + 0.1]) - inWindow(t, [CODA.flame[1] - 0.1, CODA.flame[1]]);

const lighting = (cigarette: Matrix4, burned: number, facing: number) => {
  const nozzle = cigaretteTip(cigarette, burned).add(new Vector3(0, -FLAME.height, 0));
  const turn = new Matrix4().makeRotationY(facing);
  return turn.setPosition(nozzle.sub(new Vector3(...LIGHTER.nozzle).applyMatrix4(turn)));
};

export const lighterFrame = (karen: Placement, t: number, cigarette: Matrix4, burned: number): Matrix4 => {
  const torso = torsoMatrix(KAREN_SKELETON, karen);
  const raised = blendFrames(placeFrame(torso, LIGHTER_LOW), lighting(cigarette, burned, karen.rotationY), inWindow(t, [CODA.lighterGrip, CODA.flick]));
  return blendFrames(raised, placeFrame(torso, PHONE_AT_POCKET), inWindow(t, CODA.lighterDown));
};
