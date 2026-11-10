import { Matrix4, Vector3 } from "three";
import { placeFrame, type PropPlace } from "../../characters/propPlace";
import { blendMatrices, blendThrough } from "../../toon/orient";
import { kf } from "../../characters/animate";
import { inWindow, lerpVec3, round6 } from "../../characters/scalar";
import { torsoMatrix, type Placement } from "../../characters/skeleton";
import { karenMouthEmitter, SPRAY_AHEAD } from "../../Karen/mouthEmitter";
import { KAREN_SKELETON } from "../../Karen/rig";
import { cigaretteTip } from "../../props/cigaretteShape";
import { FLAME, LIGHTER } from "../../props/lighterShape";
import { EXIT } from "./exit";
import { PHONE_AT_POCKET } from "../../Karen/phoneShape";
import { TIMELINE_FPS } from "../../frameRate";

const GONE = EXIT.end;
const at = (base: number, after: number) => round6(base + after);
const span = (base: number, from: number, to: number) => [at(base, from), at(base, to)] as const;

const mediumCut = at(GONE, 0.8);
export const COLD_START = { again: 0.4, letGo: 0.2, flame: 0.35, flaring: 1 / TIMELINE_FPS, dying: 4 / TIMELINE_FPS };

const lighterGrip = at(mediumCut, 0.3);
const firstStrike = at(lighterGrip, 0.3);
const flick = at(firstStrike, COLD_START.again);
const flameOut = at(flick, 1.5);
const jumpCut = at(flick, 3.7);
const outAgain = at(jumpCut, 1.4);

export const CODA = {
  phoneAway: span(GONE, 0, 0.5),
  mediumCut,
  lighterGrip,
  strikes: [firstStrike, flick] as const,
  coldStart: span(firstStrike, 0, COLD_START.letGo),
  flick,
  flame: [flick, flameOut] as const,
  draws: [span(flick, 0.5, 0.8), span(flick, 1.0, 1.4)] as const,
  lit: at(flick, 0.6),
  lighterDown: span(flameOut, 0, 0.8),
  takeOut: span(flameOut, 1.2, 1.6),
  exhale: span(flameOut, 0.4, 1.9),
  jumpCut,
  toLips: span(jumpCut, 0.3, 0.8),
  laterDraw: span(jumpCut, 0.8, 1.7),
  fromLips: span(jumpCut, 1.7, 2.2),
  outAgain,
  darkExhale: span(jumpCut, 1.9, 3.2),
  aside: span(jumpCut, 3.2, 3.6),
  taps: [span(jumpCut, 3.7, 3.9), span(jumpCut, 4.0, 4.2)] as const,
  ashOff: at(jumpCut, 3.8),
  end: at(jumpCut, 5.2),
};

export const BURN = { rate: 0.0045 / 60 };
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

export const LIPS = { inside: 0.005, droop: 0.2, aside: -1.1, drawAside: 1.2, corner: 0.02, open: 0.08, exhale: 0.18 };

export const TO_HER_HAND = { turn: 0.45, nod: 0.1 };

export const turnedToHerHand = (t: number) =>
  inWindow(t, [CODA.phoneAway[1], CODA.mediumCut]) - inWindow(t, [CODA.flame[1], CODA.flame[1] + 0.4]);

export const lipsFrame = (karen: Placement & { readonly mouthOpen: number }, side: 1 | -1 = 1) => {
  const { origin, forward, up } = karenMouthEmitter({ ...karen, mouthOpen: LIPS.open });
  const left = up.clone().cross(forward).normalize();
  const along = forward.clone().applyAxisAngle(left, LIPS.droop).applyAxisAngle(up, side === 1 ? LIPS.aside : LIPS.drawAside).normalize();
  const x = up.clone().cross(along).normalize();
  const y = along.clone().cross(x).normalize();
  const filterEnd = origin
    .clone()
    .addScaledVector(forward, -(SPRAY_AHEAD + LIPS.inside))
    .addScaledVector(left, -side * LIPS.corner);
  return new Matrix4().makeBasis(x, y, along).setPosition(filterEnd);
};

export const inHerHands = (t: number) => t >= CODA.mediumCut;

export const CIGARETTE_HELD: PropPlace = { position: [-0.34, 0.62, 0.45], rotation: [-0.5, -0.5, 0] };

export const CIGARETTE_ASIDE: PropPlace = { position: [-0.6, 0.5, 0.3], rotation: [0.9, -0.2, 0] };

export const ON_THE_FILTER = { along: 0.04 };

export const TAP = { pitch: 0.35, drop: 0.015 };

export const tapDipAt = (t: number) => Math.max(...CODA.taps.map(([a, b]) => kf(t, [a, (a + b) / 2, b], [0, 1, 0])));

const flicked = (frame: Matrix4, dip: number) =>
  dip <= 0
    ? frame
    : new Matrix4()
        .makeTranslation(0, -TAP.drop * dip, 0)
        .multiply(frame)
        .multiply(new Matrix4().makeTranslation(0, 0, ON_THE_FILTER.along))
        .multiply(new Matrix4().makeRotationX(TAP.pitch * dip))
        .multiply(new Matrix4().makeTranslation(0, 0, -ON_THE_FILTER.along));

export const atHerLipsAt = (t: number) =>
  1 - inWindow(t, CODA.takeOut) + inWindow(t, CODA.toLips) - inWindow(t, CODA.fromLips);

export const inHerFingersAt = (t: number) => (t >= CODA.takeOut[0] ? 1 : 0);

const heldFrame = (karen: Placement, t: number) => {
  const torso = torsoMatrix(KAREN_SKELETON, karen);
  return blendMatrices(placeFrame(torso, CIGARETTE_HELD), placeFrame(torso, CIGARETTE_ASIDE), inWindow(t, CODA.aside));
};

export const cigaretteFrame = (karen: Placement & { readonly mouthOpen: number }, t: number): Matrix4 =>
  flicked(blendMatrices(heldFrame(karen, t), lipsFrame(karen), atHerLipsAt(t)), tapDipAt(t));

export const LIGHTER_LOW: PropPlace = { position: [-0.3, 0.52, 0.38], rotation: [0, 0, 0] };

const TIPPED_FORWARD: PropPlace = { position: lerpVec3(LIGHTER_LOW.position, PHONE_AT_POCKET.position, 0.5), rotation: [Math.PI / 2, 0, 0] };

export const lighterOut = (t: number) => t >= CODA.mediumCut && t <= CODA.lighterDown[1];

export const lightingAt = (t: number) =>
  inWindow(t, [CODA.strikes[0] - 0.1, CODA.strikes[0]]) - inWindow(t, [CODA.flame[1], CODA.flame[1] + 0.1]);

const microFlameAt = (t: number) => {
  const [struck] = CODA.strikes;
  return COLD_START.flame * kf(t, [struck, struck + COLD_START.flaring, struck + COLD_START.dying], [0, 1, 0]);
};

export const flameAmountAt = (t: number) =>
  Math.max(microFlameAt(t), inWindow(t, [CODA.flame[0], CODA.flame[0] + 0.1]) - inWindow(t, [CODA.flame[1] - 0.1, CODA.flame[1]]));

export const sinceStruckAt = (t: number) => {
  const struck = CODA.strikes.filter((strike) => strike <= t);
  return struck.length === 0 ? undefined : t - struck[struck.length - 1];
};

const lighting = (cigarette: Matrix4, burned: number, facing: number) => {
  const nozzle = cigaretteTip(cigarette, burned).add(new Vector3(0, -FLAME.height, 0));
  const turn = new Matrix4().makeRotationY(facing);
  return turn.setPosition(nozzle.sub(new Vector3(...LIGHTER.nozzle).applyMatrix4(turn)));
};

export const lighterFrame = (karen: Placement, t: number, cigarette: Matrix4, burned: number): Matrix4 => {
  const torso = torsoMatrix(KAREN_SKELETON, karen);
  const low = placeFrame(torso, LIGHTER_LOW);
  const raised = blendMatrices(low, lighting(cigarette, burned, karen.rotationY), inWindow(t, [CODA.lighterGrip, CODA.strikes[0]]));
  const [down, pocketed] = CODA.lighterDown;
  const halfway = (down + pocketed) / 2;
  return blendThrough(blendMatrices(raised, low, inWindow(t, [down, halfway])), placeFrame(torso, TIPPED_FORWARD), placeFrame(torso, PHONE_AT_POCKET), inWindow(t, [halfway, pocketed]));
};
