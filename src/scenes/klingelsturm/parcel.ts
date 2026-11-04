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
import type { Hold } from "../../physics/holds";
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
  reach: window[0],
  grip: window[1],
  release: window[2],
  done: window[3],
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

const L = w + 2 * PANEL;
const R = TAPE_ROLL.radius + TAPE_ROLL.clearance;
const OH = TAPE_ROLL.overhang;
const ARC = (R * Math.PI) / 2;
const PATH = 2 * OH + L + 2 * ARC;

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

const along = (p: number) => {
  const T = lidTop();
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

const pulled = (t: number) => PATH * inWindow(t, [TAPING.start, TAPING.end]);

const FLAT = new Quaternion().setFromEuler(new Euler(-Math.PI / 2, 0, 0));
const parcelTurn = lazy(() =>
  new Quaternion().setFromEuler(new Euler(...PARCEL.rotation)),
);

const onTheLid = (x: number, y: number, normal: number) => ({
  position: new Vector3(x, y, 0).applyMatrix4(parcelFrame()),
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

const rollAt = (t: number) => {
  if (t < TAPING.start) {
    const start = along(0);
    const beside = onTheLid(start.x - BESIDE, start.y, start.normal);
    const lifted = TAPING.pick + 0.7 * (TAPING.start - TAPING.pick);
    return t < lifted
      ? blend(resting(TAPE), beside, inWindow(t, [TAPING.pick, lifted]))
      : blend(
          beside,
          onTheLid(start.x, start.y, start.normal),
          inWindow(t, [lifted, TAPING.start]),
        );
  }
  if (t <= TAPING.end) {
    const at = along(pulled(t));
    return onTheLid(at.x, at.y, at.normal);
  }
  const end = along(PATH);
  const torn = onTheLid(end.x + 0.03, end.y + 0.02, 0);
  if (t <= TAPING.end + TEAR)
    return blend(
      onTheLid(end.x, end.y, 0),
      torn,
      inWindow(t, [TAPING.end, TAPING.end + TEAR]),
    );
  return blend(
    torn,
    resting(TAPE_PUT_DOWN),
    inWindow(t, [TAPING.end + TEAR, TAPING.down]),
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
  name: string,
  center: readonly [number, number],
  size: readonly [number, number],
): Obb =>
  obb(
    name,
    parcelFrame(),
    [size[0], size[1], TAPE_ROLL.width],
    [center[0], center[1], 0],
  );

export const tapeStripAt = (t: number): Obb[] => {
  const p = pulled(t);
  const T = lidTop();
  const th = TAPE_ROLL.thickness;
  const pieces: Obb[] = [];
  const up = Math.min(OH, p);
  if (up > 0)
    pieces.push(
      stripPiece(
        "tape up the start end",
        [-L / 2 - th / 2, T - OH + up / 2],
        [th, up],
      ),
    );
  const top = clamp(p - OH - ARC, 0, L);
  if (top > 0)
    pieces.push(
      stripPiece(
        "tape along the lid",
        [-L / 2 + top / 2, T + th / 2],
        [top, th],
      ),
    );
  const down = clamp(p - OH - 2 * ARC - L, 0, OH);
  if (down > 0)
    pieces.push(
      stripPiece(
        "tape down the far end",
        [L / 2 + th / 2, T - down / 2],
        [th, down],
      ),
    );
  return pieces;
};

const onTop = (t: number) =>
  new Vector3(0, 0, 0)
    .applyMatrix4(tapeRollFrame(t))
    .add(new Vector3(0, TAPE_ROLL.radius, 0));

export const TAPING_HOLDS: readonly Hold[] = [
  {
    name: "the tape roll, started with the left hand",
    arm: "leftArm",
    reach: TAPING.at,
    grip: TAPING.pick,
    release: TAPING.handover + 0.05,
    done: TAPING.handover + 0.35,
    target: tapeRollSolid,
    near: onTop,
  },
  {
    name: "the tape roll, taken over by the right hand",
    arm: "rightArm",
    reach: TAPING.handover - 0.3,
    grip: TAPING.handover - 0.05,
    release: TAPING.down,
    done: TAPING.done,
    target: tapeRollSolid,
    near: onTop,
  },
];
