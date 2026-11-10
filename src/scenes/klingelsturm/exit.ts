import { GREETING_CUT_FRAMES, LATER_FRAMES, later } from "./banging";
import { stairwellGround } from "../../building/stairwell";
import { armKf, kf } from "../../characters/animate";
import { shiftSteps, type RootAt, type Step } from "../../characters/gait";
import { inWindow, round6 } from "../../characters/scalar";
import type { ArmPose } from "../../characters/skeleton";
import type { Hold } from "../../physics/holds";
import {
  HOLDS as LEAVING_HOLDS,
  LEAVING,
  tibikDoorAt as leavingDoorAt,
  tibikLeverAt as leavingLeverAt,
  ARMS_IN_WITH_THE_PARCEL,
  treppenhausRoot,
  treppenhausSteps,
} from "../treppenhaus/choreography";
import { FPS } from "../../frameRate";
import { CRADLE } from "./carry";
import { AT_THE_CHEST } from "./parcel";

export const EXIT = {
  offset: (1468 + LATER_FRAMES - GREETING_CUT_FRAMES) / FPS,
  pickup: later(47.3),
  walk: later(47.45),
  nod: 0.9,
  wait: 20 / FPS,
  end: later(57.7),
};

const AT_THE_LEVER = treppenhausRoot(0).yaw - 2 * Math.PI;
const NOD_U = LEAVING.atTheTop;
const UNSEEN_LIFT = 0.4;
const SIDESTEP = 0.9;
const LATE_IN_THE_SHUT = 0.45;
const TOWARD_THE_SWITCH: ArmPose = {
  raise: 0.8,
  out: 0.2,
  elbow: 0.8,
  inward: 0.3,
};
const CLEAR_OF_HIS_DOOR = 0.2;
const CLEAR_OF_THE_BALUSTRADE = 0.08;
const WAITING_AT = LEAVING.sidle[0];
const LETS_GO_OF_THE_LEVER = 0.3;
const SWAPPING = 0.3;
const SWAP: readonly [number, number] = [WAITING_AT + LETS_GO_OF_THE_LEVER, WAITING_AT + LETS_GO_OF_THE_LEVER + SWAPPING];
const SWUNG_AT = LEAVING.shut[0];

const held = (u: number, at: number, pause: number) =>
  u <= at ? u : Math.max(at, u - pause);

const nodded = (u: number) => held(u, NOD_U, EXIT.nod);

const waitingFrom = (at: number) => (t: number) =>
  nodded(held(t - EXIT.offset, at, EXIT.wait));

export const exitTime = waitingFrom(WAITING_AT);

const doorTime = waitingFrom(SWUNG_AT);

export const filmTime = (u: number) =>
  u +
  EXIT.offset +
  (u > WAITING_AT ? EXIT.wait : 0) +
  (u > NOD_U ? EXIT.nod : 0);

export const AT_THE_SWITCH_AT = filmTime(LEAVING.toTheSwitch[1]);

export const DOWN_THE_STAIRS = filmTime(LEAVING.descentStart);

export const EXIT_SOUNDS = {
  doorOpens: filmTime(LEAVING.leverPull[0]),
  doorShuts: filmTime(LEAVING.shut[1]),
  lightSwitch: filmTime(LEAVING.lightPress),
};

export const NODDING: readonly [number, number] = [
  filmTime(NOD_U),
  filmTime(NOD_U) + EXIT.nod,
];

const WALK = {
  turn: [EXIT.walk, EXIT.walk + 0.5] as const,
  move: [EXIT.walk + 0.15, EXIT.walk + 1.15] as const,
};

const doorway = () => treppenhausRoot(LEAVING.shut[0]).x;
const outside = () => treppenhausRoot(LEAVING.shut[1]).x;

const sideways = (u: number) => {
  if (u < LEAVING.shut[0]) return 0;
  if (u <= LEAVING.shut[1])
    return (
      (treppenhausRoot(u).x - doorway()) *
      (SIDESTEP - 1) *
      kf(u, [LEAVING.shut[1] - LATE_IN_THE_SHUT, LEAVING.shut[1]], [0, 1])
    );
  return kf(
    u,
    [
      LEAVING.toTheSwitch[0],
      LEAVING.toTheSwitch[1],
      LEAVING.leaveTheSwitch,
      LEAVING.turnSteps[1][1],
      LEAVING.descentStart,
      LEAVING.descentStart + 2 * LEAVING.step,
    ],
    [
      (outside() - doorway()) * (SIDESTEP - 1),
      0,
      0,
      CLEAR_OF_HIS_DOOR,
      CLEAR_OF_HIS_DOOR,
      CLEAR_OF_THE_BALUSTRADE,
    ],
  );
};

export const exitRoot =
  (before: RootAt): RootAt =>
  (t) => {
    if (t < EXIT.walk) return before(t);
    if (t >= EXIT.offset) {
      const u = exitTime(t);
      const root = treppenhausRoot(u);
      return {
        ...root,
        x: root.x + sideways(u),
        yaw:
          root.yaw - 2 * Math.PI,
      };
    }
    const [bx, bz] = LEAVING.besideHisDoor;
    const moved = inWindow(t, WALK.move);
    const x = AT_THE_CHEST.x + (bx - AT_THE_CHEST.x) * moved;
    const z = AT_THE_CHEST.z + (bz - AT_THE_CHEST.z) * moved;
    return {
      x,
      z,
      yaw:
        AT_THE_CHEST.yaw +
        (AT_THE_LEVER - AT_THE_CHEST.yaw) * inWindow(t, WALK.turn),
      y: stairwellGround(x, z),
    };
  };

export const exitSteps = (walk: readonly Step[], from: number, until: number): Step[] => [
  ...shiftSteps(walk, EXIT.walk - from),
  ...treppenhausSteps()
    .filter(
      (s) => s.lift >= LEAVING.sidle[0] && filmTime(s.land) < until,
    )
    .map((s) => ({
      ...s,
      lift: filmTime(s.lift),
      land: filmTime(s.land),
      ...(s.at ? { at: { x: s.at.x + sideways(s.land), z: s.at.z } } : {}),
    })),
];

export const exitDoorAt = (t: number) =>
  t < EXIT.offset ? 0 : leavingDoorAt(doorTime(t));

export const exitLeverAt = (t: number) =>
  t < EXIT.offset ? 0 : leavingLeverAt(doorTime(t));

const shifted = (hold: Hold): Hold => ({
  ...hold,
  reach: filmTime(hold.reach),
  grip: filmTime(hold.grip),
  release: filmTime(hold.release),
  done: filmTime(hold.done),
  target: (t) => hold.target(doorTime(t)),
});

const LEVER_SPRINGS_BACK = 0.1;

export const EXIT_HOLDS: readonly Hold[] = LEAVING_HOLDS.filter((h) =>
  ["his door lever", "his door knob", "the light button"].includes(h.name),
)
  .map(shifted)
  .map((h) => (h.name === "his door lever" ? { ...h, release: round6(h.release - LEVER_SPRINGS_BACK), done: round6(filmTime(WAITING_AT) + LETS_GO_OF_THE_LEVER) } : h));

export const carriedAt = (t: number) => t >= EXIT.pickup;

export const swapAt = (t: number) =>
  t < EXIT.offset ? 0 : inWindow(t - EXIT.offset, SWAP);

export const exitArms = (
  t: number,
  rest: { readonly leftArm: ArmPose; readonly rightArm: ArmPose },
) => {
  const u = exitTime(t);
  const swap = swapAt(t);
  const free = (pose: ArmPose, carrying: number): ArmPose =>
    armKf(carrying, [0, 1], [pose, CRADLE]);
  const lifted = armKf(
    t,
    [EXIT.pickup - UNSEEN_LIFT, EXIT.pickup],
    [rest.leftArm, CRADLE],
  );
  const rightFree =
    t < EXIT.offset
      ? armKf(
          t,
          [EXIT.offset - 0.6, EXIT.offset],
          [rest.rightArm, ARMS_IN_WITH_THE_PARCEL.rightArm(0)],
        )
      : ARMS_IN_WITH_THE_PARCEL.rightArm(u);
  const [shut, reach] = [LEAVING.shut[1], LEAVING.buttonHold.reach];
  const leftFree =
    u > shut && u < reach
      ? armKf(
          u,
          [shut, shut + 0.25, reach - 0.2, reach],
          [
            ARMS_IN_WITH_THE_PARCEL.leftArm(shut),
            TOWARD_THE_SWITCH,
            TOWARD_THE_SWITCH,
            ARMS_IN_WITH_THE_PARCEL.leftArm(reach),
          ],
        )
      : ARMS_IN_WITH_THE_PARCEL.leftArm(u);
  return {
    leftArm: t < EXIT.offset ? lifted : free(leftFree, 1 - swap),
    rightArm: free(rightFree, swap),
  };
};

const LOOK_BACK = { head: 1.0, eyes: 0.8 };
const NOD_DIP = 0.3;

export const exitHead = (t: number) => {
  const u = exitTime(t);
  const [a, b] = NODDING;
  const mid = (a + b) / 2;
  const look = kf(t, [a, a + 0.25, b - 0.15, b + 0.1], [0, 1, 1, 0]);
  return {
    headPitch:
      kf(
        u,
        [LEAVING.descentStart - 0.3, LEAVING.descentStart + 0.3],
        [0, 0.2],
      ) + kf(t, [mid - 0.15, mid, mid + 0.2], [0, NOD_DIP, 0]),
    headYaw: LOOK_BACK.head * look,
    gazeYaw: LOOK_BACK.eyes * look,
  };
};
