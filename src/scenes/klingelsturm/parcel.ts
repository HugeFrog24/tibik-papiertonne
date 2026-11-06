import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import { CHEST } from "../../building/flurShape";
import { clamp, inWindow } from "../../characters/scalar";
import { frame, obb, type Obb } from "../../physics/collision";
import { lazy } from "../../physics/lazy";
import {
  FOUND_KARTON_SIZE,
  PANEL,
  kartonFlapSolids,
  type FlapOrder,
} from "../../street/kartonShape";
import type { ArmName } from "../../characters/skeleton";
import { holdWindow, type Hold } from "../../physics/holds";
import type { Vec3 } from "../../toon/primitives";

const chestTop = CHEST.center[1] + CHEST.size[1] / 2;
const chestFront = CHEST.center[0] + CHEST.size[0] / 2;
const [w, h, d] = FOUND_KARTON_SIZE;
const ASKEW = 0.3;

export const PARCEL = {
  position: [
    chestFront - 0.03 - d / 2 - PANEL,
    chestTop + h / 2 + 0.001,
    CHEST.center[2] - 0.12,
  ] as Vec3,
  rotation: [0, Math.PI / 2 + ASKEW, 0] as Vec3,
  size: FOUND_KARTON_SIZE,
  open: 1,
  splay: 0.08,
};

export const BOOK = {
  center: [
    PARCEL.position[0],
    chestTop + 2 * PANEL + 0.015,
    PARCEL.position[2],
  ] as Vec3,
  size: [0.14, 0.03, 0.2] as Vec3,
};

export const TAPE_ROLL = {
  radius: 0.052,
  core: 0.038,
  width: 0.05,
  overhang: 0.05,
  thickness: 0.0005,
  clearance: 0.001,
};

const restingAt = (z: number) => ({
  center: [
    PARCEL.position[0] - 0.01,
    chestTop + TAPE_ROLL.width / 2,
    z,
  ] as Vec3,
  size: [2 * TAPE_ROLL.radius, TAPE_ROLL.width, 2 * TAPE_ROLL.radius] as Vec3,
});

export const TAPE = restingAt(CHEST.center[2] + 0.12);
export const TAPE_PUT_DOWN = restingAt(
  CHEST.center[2] - CHEST.size[2] / 2 + 0.075,
);

export const PACKING = {
  from: 2.6,
  ends: 3.35,
  near: [3.55, 3.95] as const,
  far: [4.0, 4.4] as const,
  to: 4.4,
};

export const TAPING = {
  at: 17.2,
  pick: 17.45,
  start: 17.8,
  handover: 18.7,
  end: 19.6,
  down: 20.0,
  done: 20.3,
};

export const TAPING_AGAIN = {
  at: 32.2,
  pick: 32.45,
  start: 32.8,
  handover: 33.7,
  end: 34.6,
  down: 35.0,
  done: 35.3,
};

export type TapeStrip = {
  readonly name: string;
  readonly times: typeof TAPING;
  readonly layer: number;
  readonly aside: number;
  readonly mirrored: boolean;
};

export const TAPE_STRIPS: readonly TapeStrip[] = [
  { name: "along the seam", times: TAPING, layer: 0, aside: 0, mirrored: false },
  { name: "over the first", times: TAPING_AGAIN, layer: 1, aside: 0.015, mirrored: true },
];

export const AT_THE_CHEST = {
  x: chestFront + 0.4,
  z: PARCEL.position[2],
  yaw: -Math.PI / 2,
};

export const parcelClosedAt = (t: number) =>
  0.5 * inWindow(t, [PACKING.from, PACKING.ends]) +
  0.25 * inWindow(t, PACKING.near) +
  0.25 * inWindow(t, PACKING.far);

export const parcelFrame = lazy(() =>
  frame(new Matrix4(), PARCEL.position, new Euler(...PARCEL.rotation)),
);

export const parcelBody = (): Obb =>
  obb("parcel", parcelFrame(), [w + 2 * PANEL, h, d + 2 * PANEL]);

export const parcelSolids = (closed: number, taping: number): Obb[] => [
  parcelBody(),
  ...kartonFlapSolids(
    PARCEL.size,
    PARCEL.open,
    closed,
    parcelFrame(),
    0,
    parcelOrder(),
    PARCEL.splay,
  ),
  tapeRollSolid(taping),
];

const chosen = lazy(() => {
  const flaps = kartonFlapSolids(
    PARCEL.size,
    PARCEL.open,
    0,
    parcelFrame(),
    0,
    undefined,
    PARCEL.splay,
  );
  const ends = [1, 3].sort((a, b) => flaps[b].center.z - flaps[a].center.z);
  const sides = [0, 2].sort((a, b) => flaps[a].center.x - flaps[b].center.x);
  return { leftEnd: ends[0], rightEnd: ends[1], far: sides[0], near: sides[1] };
});

export const parcelOrder = lazy((): FlapOrder => {
  const { near, far } = chosen();
  return [0, 1, 2, 3].map((i) =>
    i === near
      ? ([0.5, 0.75] as const)
      : i === far
        ? ([0.75, 1] as const)
        : ([0, 0.5] as const),
  );
});

const flapsAt = (t: number) =>
  kartonFlapSolids(
    PARCEL.size,
    PARCEL.open,
    parcelClosedAt(t),
    parcelFrame(),
    0,
    parcelOrder(),
    PARCEL.splay,
  );

const flapHold = (
  name: string,
  arm: ArmName,
  pick: (c: ReturnType<typeof chosen>) => number,
  window: readonly [number, number, number, number],
  along = 0.6,
  aside = 0,
): Hold => ({
  name,
  arm,
  ...holdWindow(window),
  target: (t) => flapsAt(t)[pick(chosen())],
  near: (t) => {
    const flap = flapsAt(t)[pick(chosen())];
    const sideways = Math.sign(flap.axes[0].z) * aside;
    return flap.center
      .clone()
      .addScaledVector(flap.axes[1], flap.half[1] * along)
      .addScaledVector(flap.axes[0], flap.half[0] * sideways);
  },
});

const ENDS = [2.3, PACKING.from, PACKING.ends, 3.45] as const;
const NEAR = [3.45, PACKING.near[0], PACKING.near[1], 4.15] as const;
const FAR = [3.8, PACKING.far[0], PACKING.far[1], 4.65] as const;

export const PACKING_HOLDS: readonly Hold[] = [
  flapHold("the left end flap", "leftArm", (c) => c.leftEnd, ENDS),
  flapHold("the right end flap", "rightArm", (c) => c.rightEnd, ENDS),
  flapHold("the far long flap", "leftArm", (c) => c.far, FAR, 0.6, 0.9),
  flapHold("the near long flap", "rightArm", (c) => c.near, NEAR, 0.6, -0.9),
];

const R = TAPE_ROLL.radius + TAPE_ROLL.clearance;
const OH = TAPE_ROLL.overhang;
const ARC = (R * Math.PI) / 2;
const L = w + 2 * PANEL;
const PATH = 2 * OH + L + 2 * ARC;
const layerOf = (strip: TapeStrip) => strip.layer * TAPE_ROLL.thickness;

const lidTop = lazy(() => {
  const up = new Vector3(0, 1, 0);
  const flaps = kartonFlapSolids(
    PARCEL.size,
    PARCEL.open,
    1,
    parcelFrame(),
    0,
    parcelOrder(),
    PARCEL.splay,
  );
  return (
    Math.max(
      ...flaps.map(
        (f) =>
          f.center.y +
          f.axes.reduce((s, a, k) => s + Math.abs(a.dot(up)) * f.half[k], 0),
      ),
    ) - PARCEL.position[1]
  );
});

const mirror = (strip: TapeStrip, at: { x: number; y: number; normal: number }) =>
  strip.mirrored ? { x: -at.x, y: at.y, normal: Math.PI - at.normal } : at;

const along = (strip: TapeStrip, p: number) => mirror(strip, pathPoint(strip, p));

const pathPoint = (strip: TapeStrip, p: number) => {
  const T = lidTop() + layerOf(strip);
  if (p <= OH) return { x: -L / 2 - R, y: T - OH + p, normal: Math.PI };
  if (p <= OH + ARC) {
    const a = Math.PI - (p - OH) / R;
    return { x: -L / 2 + R * Math.cos(a), y: T + R * Math.sin(a), normal: a };
  }
  if (p <= OH + ARC + L)
    return { x: -L / 2 + (p - OH - ARC), y: T + R, normal: Math.PI / 2 };
  if (p <= OH + 2 * ARC + L) {
    const a = Math.PI / 2 - (p - OH - ARC - L) / R;
    return { x: L / 2 + R * Math.cos(a), y: T + R * Math.sin(a), normal: a };
  }
  return { x: L / 2 + R, y: T - (p - OH - 2 * ARC - L), normal: 0 };
};

const pulled = (strip: TapeStrip, t: number) =>
  PATH * inWindow(t, [strip.times.start, strip.times.end]);

const FLAT = new Quaternion().setFromEuler(new Euler(-Math.PI / 2, 0, 0));
const parcelTurn = lazy(() =>
  new Quaternion().setFromEuler(new Euler(...PARCEL.rotation)),
);

const onTheLid = (strip: TapeStrip, x: number, y: number, normal: number) => ({
  position: new Vector3(x, y, strip.aside).applyMatrix4(parcelFrame()),
  turn: parcelTurn()
    .clone()
    .multiply(
      new Quaternion().setFromAxisAngle(
        new Vector3(0, 0, 1),
        normal - Math.PI / 2,
      ),
    ),
});

const resting = (place: { readonly center: Vec3 }) => ({
  position: new Vector3(...place.center),
  turn: FLAT.clone(),
});

const blend = (
  a: ReturnType<typeof resting>,
  b: ReturnType<typeof resting>,
  k: number,
) => ({
  position: a.position.clone().lerp(b.position, k),
  turn: a.turn.clone().slerp(b.turn, k),
});

const TEAR = 0.15;
const BESIDE = 0.04;

const stripAt = (t: number) =>
  TAPE_STRIPS[t < TAPING_AGAIN.at ? 0 : 1];

const rollAt = (t: number) => {
  const strip = stripAt(t);
  const { pick, start, end: last, down } = strip.times;
  const from = strip.mirrored ? TAPE_PUT_DOWN : TAPE;
  const to = strip.mirrored ? TAPE : TAPE_PUT_DOWN;
  const away = strip.mirrored ? -1 : 1;
  if (t < start) {
    const first = along(strip, 0);
    const beside = onTheLid(strip, first.x - away * BESIDE, first.y, first.normal);
    const lifted = pick + 0.7 * (start - pick);
    return t < lifted
      ? blend(resting(from), beside, inWindow(t, [pick, lifted]))
      : blend(
          beside,
          onTheLid(strip, first.x, first.y, first.normal),
          inWindow(t, [lifted, start]),
        );
  }
  if (t <= last) {
    const at = along(strip, pulled(strip, t));
    return onTheLid(strip, at.x, at.y, at.normal);
  }
  const final = along(strip, PATH);
  const torn = onTheLid(strip, final.x + away * 0.03, final.y + 0.02, final.normal);
  if (t <= last + TEAR)
    return blend(
      onTheLid(strip, final.x, final.y, final.normal),
      torn,
      inWindow(t, [last, last + TEAR]),
    );
  return blend(
    torn,
    resting(to),
    inWindow(t, [last + TEAR, down]),
  );
};

export const tapeRollFrame = (t: number) => {
  const { position, turn } = rollAt(t);
  return new Matrix4().compose(position, turn, new Vector3(1, 1, 1));
};

export const tapeRollSolid = (t: number): Obb =>
  obb("tape roll", tapeRollFrame(t), [
    2 * TAPE_ROLL.radius,
    2 * TAPE_ROLL.radius,
    TAPE_ROLL.width,
  ]);

const stripPiece = (
  strip: TapeStrip,
  name: string,
  center: readonly [number, number],
  size: readonly [number, number],
): Obb =>
  obb(
    strip.layer > 0 ? `${name}, again` : name,
    parcelFrame(),
    [size[0], size[1], TAPE_ROLL.width],
    [strip.mirrored ? -center[0] : center[0], center[1], strip.aside],
  );

export const stripPiecesAt = (strip: TapeStrip, t: number): Obb[] => {
  const p = pulled(strip, t);
  const T = lidTop() + layerOf(strip);
  const out = layerOf(strip);
  const th = TAPE_ROLL.thickness;
  const pieces: Obb[] = [];
  const up = Math.min(OH, p);
  if (up > 0)
    pieces.push(
      stripPiece(
        strip,
        "tape up the start end",
        [-L / 2 - out - th / 2, T - OH + up / 2],
        [th, up],
      ),
    );
  const top = clamp(p - OH - ARC, 0, L);
  if (top > 0)
    pieces.push(
      stripPiece(
        strip,
        "tape along the lid",
        [-L / 2 + top / 2, T + th / 2],
        [top, th],
      ),
    );
  const fall = clamp(p - OH - 2 * ARC - L, 0, OH);
  if (fall > 0)
    pieces.push(
      stripPiece(
        strip,
        "tape down the far end",
        [L / 2 + out + th / 2, T - fall / 2],
        [th, fall],
      ),
    );
  return pieces;
};

export const tapeStripAt = (t: number): Obb[] =>
  TAPE_STRIPS.flatMap((strip) => stripPiecesAt(strip, t));

const onTop = (t: number) =>
  new Vector3(0, 0, 0)
    .applyMatrix4(tapeRollFrame(t))
    .add(new Vector3(0, TAPE_ROLL.radius, 0));

export const tapingHoldsOf = ({ name, times, mirrored }: TapeStrip): Hold[] => [
  {
    name: `the tape roll ${name}, started with the ${mirrored ? "right" : "left"} hand`,
    arm: mirrored ? "rightArm" : "leftArm",
    reach: times.at,
    grip: times.pick,
    release: times.handover + 0.05,
    done: times.handover + 0.35,
    target: tapeRollSolid,
    near: onTop,
  },
  {
    name: `the tape roll ${name}, taken over by the ${mirrored ? "left" : "right"} hand`,
    arm: mirrored ? "leftArm" : "rightArm",
    reach: times.handover - 0.3,
    grip: times.handover - 0.05,
    release: times.down,
    done: times.done,
    target: tapeRollSolid,
    near: onTop,
  },
];

export const TAPING_HOLDS: readonly Hold[] = TAPE_STRIPS.flatMap(tapingHoldsOf);
