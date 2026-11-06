import { Vector3 } from "three";
import { indoorSolids } from "../../building/flurShape";
import { bodyColliders } from "../../characters/skeleton";
import { asKaren } from "../../Karen/character";
import { karenMouthEmitter } from "../../Karen/mouthEmitter";
import { KAREN_SKELETON } from "../../Karen/rig";
import { nearby, type Sphere } from "../../physics/collision";
import { lazy } from "../../physics/lazy";
import { memoByFrame } from "../../physics/memoSolve";
import { lightsAt } from "./light";
import { cigaretteTip } from "../../props/cigaretteShape";
import { clearOf, curlsAt, SMOKE, type Curl, type SmokeScene, type SmokeSource } from "../../smoke/smoke";
import { filmShownIn } from "../../toon/shots";
import { SHOTS, storyTime } from "./cameras";
import { karenAt } from "./choreography";
import { CODA } from "./cigarette";
import { cigaretteAt, smokedAt } from "./smoking";

const OTHER_CORNER = 0.02;
const BLOW = { up: 0.4, aside: 0.8 };
const UP = new Vector3(0, 1, 0);

const mouthAt = (t: number) => {
  const { origin, forward, up } = karenMouthEmitter(karenAt(t));
  return { origin, forward, left: up.clone().cross(forward).normalize() };
};

export const SMOKE_SOURCES: readonly SmokeSource[] = [
  {
    name: "the ember's wisp",
    kind: "wisp",
    windows: [[CODA.lit, CODA.end]],
    origin: (t) => cigaretteTip(cigaretteAt(t), smokedAt(t).burned),
  },
  {
    name: "her exhale",
    kind: "exhale",
    windows: [CODA.exhale, CODA.darkExhale],
    origin: (t) => {
      const { origin, left } = mouthAt(t);
      return origin.addScaledVector(left, OTHER_CORNER);
    },
    direction: (t) => {
      const { forward, left } = mouthAt(t);
      return forward.addScaledVector(UP, BLOW.up).addScaledVector(left, BLOW.aside).normalize();
    },
  },
];

const SMOKE_SOLIDS = lazy(() => indoorSolids({ tibik: 0, tibikLever: 0 }));

export const karenBodyAt = (t: number): Sphere[] => {
  const body = bodyColliders(KAREN_SKELETON, asKaren(karenAt(t)));
  return [...body.torso, ...body.head, ...body.leftArm, ...body.rightArm];
};

export const HAZE = {
  opacity: 0.1,
  drift: 0.02,
  settles: 0.2,
  spots: [
    { aside: -0.5, up: 0.03, back: 0.05, radius: 0.09 },
    { aside: 0.45, up: -0.03, back: -0.15, radius: 0.11 },
    { aside: -0.25, up: 0.05, back: -0.45, radius: 0.08 },
    { aside: 0.3, up: 0, back: -0.5, radius: 0.1 },
    { aside: 0.05, up: 0.06, back: -0.6, radius: 0.07 },
  ] as const,
};

const hazeAt = (t: number): Curl[] => {
  if (t < CODA.jumpCut) return [];
  const drifted = HAZE.drift * (storyTime(t) - storyTime(CODA.jumpCut));
  const head = mouthAt(CODA.jumpCut).origin;
  return HAZE.spots.map(({ aside, up, back, radius }) => {
    const center = new Vector3(head.x + aside + drifted, head.y + HAZE.settles + up, head.z + back);
    const around = [...nearby(SMOKE_SOLIDS(), center, SMOKE.reach), ...karenBodyAt(t)];
    return clearOf({ born: CODA.jumpCut, center, radius, flat: 1, opacity: HAZE.opacity }, around);
  });
};

export const IN_THE_DARK = 0.4;

const litBy = (lights: number) => (curl: Curl): Curl => ({ ...curl, opacity: curl.opacity * (IN_THE_DARK + (1 - IN_THE_DARK) * lights) });

export const codaSmokeScene = lazy(
  (): SmokeScene => ({ storyAt: storyTime, filmAt: filmShownIn(SHOTS), sources: SMOKE_SOURCES, solids: SMOKE_SOLIDS(), bodies: karenBodyAt }),
);

export const codaCurlsAt = (t: number, lights = 1): Curl[] =>
  t < CODA.lit
    ? []
    : [
        ...curlsAt(t, codaSmokeScene()),
        ...hazeAt(t),
      ].map(litBy(lights));

export const codaSmokeAt = memoByFrame((t: number) => codaCurlsAt(t, lightsAt(t)));
