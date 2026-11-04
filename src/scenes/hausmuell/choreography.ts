import { Easing } from "remotion";
import { armKf, blinkAt, kf } from "../../characters/animate";
import {
  opposite,
  planGait,
  plantFeet,
  rhythmicSteps,
  strideAt,
  touchdownTimes,
  type GaitStyle,
  type RootAt,
  type Step,
} from "../../characters/gait";
import type { ArmPose, Pose } from "../../characters/skeleton";
import {
  KAREN_ARM_HIPS,
  KAREN_ARM_POINT,
  KAREN_REST,
  KAREN_SKELETON,
  karenRunArm,
  limitKarenHead,
} from "../../Karen/rig";
import {
  PAPIERTONNEN_LAST_T,
  kartonAt as papiertonnenKartonAt,
  tibikAt as papiertonnenTibikAt,
  type KartonState,
  type TibikFrame,
} from "../papiertonnen/choreography";
import { RIG } from "../../Tibik/rig";
import { TIBIK_GAIT } from "../../Tibik/character";
import { lazy } from "../../physics/lazy";
import type { Vec3 } from "../../toon/primitives";
import { speakingAmountIn, speakingIn, type Line } from "../../dialogue/line";
import type { KarenFrame } from "../../Karen/character";

export const HAUSMUELL_DURATION = 28.5;
const WALKS_ON = HAUSMUELL_DURATION + 2;

export const SHOT_KAREN_YELLS = 2.0;
export const SHOT_TIBIK_ASKS = 4.0;
export const SHOT_KAREN_ACCUSES = 5.6;
export const SHOT_TIBIK_EXPLAINS = 7.8;
export const SHOT_KAREN_THREATENS = 13.0;
export const SHOT_TIBIK_WHO = 16.0;
export const SHOT_KAREN_NAMES = 17.5;
export const SHOT_TIBIK_WEISUNG = 20.0;
export const SHOT_KAREN_WIE = 22.2;
export const SHOT_EXIT = 23.6;

export const LINES: readonly Line[] = [
  {
    speaker: "karen",
    from: 2.1,
    to: 3.9,
    text: "DAS DÜRFEN SIE NICHT!!!!",
    name: "Karen: Das dürfen Sie nicht",
    tone: "shout",
    box: { left: 980, top: 40, width: 860, height: 410, fontSize: 92 },
  },
  {
    speaker: "tibik",
    from: 4.2,
    to: 5.5,
    text: "Was darf ich nicht?",
    name: "Tibik: Was darf ich nicht?",
    tone: "calm",
    box: { left: 120, top: 60, width: 640, height: 250, fontSize: 56 },
  },
  {
    speaker: "karen",
    from: 5.7,
    to: 7.6,
    text: "SIE KLAUEN DEN HAUSMÜLL!",
    name: "Karen: Sie klauen den Hausmüll",
    tone: "shout",
    box: { left: 960, top: 40, width: 900, height: 400, fontSize: 88 },
  },
  {
    speaker: "tibik",
    from: 7.9,
    to: 9.9,
    text: "Ich verwende den Karton nur wieder.",
    name: "Tibik: Karton wiederverwenden",
    tone: "calm",
    box: { left: 100, top: 50, width: 760, height: 280, fontSize: 54 },
  },
  {
    speaker: "tibik",
    from: 10.1,
    to: 12.7,
    text: "Das spart einen neuen und schont die Umwelt.",
    name: "Tibik: Umweltschutz",
    tone: "calm",
    box: { left: 100, top: 50, width: 800, height: 300, fontSize: 54 },
  },
  {
    speaker: "karen",
    from: 13.1,
    to: 15.6,
    text: "ICH MELDE SIE DER HAUSVERWALTUNG!",
    name: "Karen: Hausverwaltung",
    tone: "shout",
    box: { left: 560, top: 30, width: 860, height: 380, fontSize: 80 },
  },
  {
    speaker: "tibik",
    from: 16,
    to: 17.4,
    text: "Wer sind Sie überhaupt?",
    name: "Tibik: Wer sind Sie",
    tone: "calm",
    box: { left: 120, top: 60, width: 700, height: 260, fontSize: 56 },
  },
  {
    speaker: "karen",
    from: 17.6,
    to: 18.45,
    text: "SCHULZ!",
    name: "Karen: Schulz",
    tone: "shout",
    box: { left: 900, top: 40, width: 960, height: 400, fontSize: 80 },
  },
  {
    speaker: "karen",
    from: 18.6,
    to: 19.9,
    text: "ICH WOHNE IHNEN GEGENÜBER!",
    name: "Karen: Gegenüber",
    tone: "shout",
    box: { left: 900, top: 40, width: 960, height: 400, fontSize: 80 },
  },
  {
    speaker: "tibik",
    from: 20.1,
    to: 22.2,
    text: "Haben Sie überhaupt eine Weisungsbefugnis?",
    name: "Tibik: Weisungsbefugnis",
    tone: "calm",
    box: { left: 100, top: 50, width: 820, height: 300, fontSize: 54 },
  },
  {
    speaker: "karen",
    from: 22.3,
    to: 23.4,
    text: "…WIE BITTE?!",
    name: "Karen: Wie bitte",
    tone: "shout",
    box: { left: 1000, top: 50, width: 760, height: 340, fontSize: 96 },
  },
  {
    speaker: "tibik",
    from: 23.7,
    to: 25.4,
    text: "Schönen Tag noch, Frau Schulz.",
    name: "Tibik: Schönen Tag noch",
    tone: "calm",
    box: { left: 80, top: 50, width: 760, height: 280, fontSize: 52 },
  },
  {
    speaker: "karen",
    from: 26,
    to: 27.6,
    text: "DAS HAT EIN NACHSPIEL!",
    name: "Karen: Nachspiel",
    tone: "shout",
    box: { left: 1000, top: 30, width: 860, height: 380, fontSize: 84 },
  },
];

const speaking = speakingIn(LINES);
const yellingAmount = speakingAmountIn(LINES);

export const TIBIK_SPOT: Vec3 = [1.4, 0, -0.7];
export const KAREN_SPOT: Vec3 = [3.05, 0, -0.35];
export const facing = (from: Vec3, to: Vec3) =>
  Math.atan2(to[0] - from[0], to[2] - from[2]);

const EXIT_TURN: readonly [number, number] = [24.6, 25.2];
const EXIT_YAW = -Math.PI / 2;
const EXIT_SPEED = 0.85;
const EXIT_EASE = 0.6;
const exitDistance = (t: number) => {
  const u = t - EXIT_TURN[1];
  if (u <= 0) return 0;
  return u < EXIT_EASE
    ? (EXIT_SPEED * u * u) / (2 * EXIT_EASE)
    : EXIT_SPEED * (u - EXIT_EASE / 2);
};
const exitSpeed = (t: number) =>
  (exitDistance(t + 0.005) - exitDistance(t - 0.005)) / 0.01;
const tibikX = (t: number) =>
  papiertonnenTibikAt(PAPIERTONNEN_LAST_T).position[0] - exitDistance(t);

const tibikTurnAt = (t: number) => {
  const start = papiertonnenTibikAt(PAPIERTONNEN_LAST_T);
  const turn = kf(t, [1.0, 1.5], [0, 1]);
  const towardsKaren = facing(start.position, KAREN_SPOT);
  return (
    start.rotationY +
    (towardsKaren - start.rotationY) * turn +
    (EXIT_YAW - towardsKaren) * kf(t, EXIT_TURN, [0, 1])
  );
};
const TIBIK_TURN_STEPS: Step[] = [
  { side: 1, lift: 1.0, land: 1.22 },
  { side: -1, lift: 1.25, land: 1.47 },
  { side: 1, lift: 24.7, land: 24.92 },
  { side: -1, lift: 24.95, land: 25.18 },
  ...rhythmicSteps({
    from: EXIT_TURN[1],
    to: WALKS_ON,
    first: 1,
    cadence: (t) => 0.8 + 1.3 * exitSpeed(t),
    overlap: 0.06,
  }),
];
export const tibikGait = lazy(() => {
  const [, , z] = papiertonnenTibikAt(PAPIERTONNEN_LAST_T).position;
  return planGait(
    RIG,
    TIBIK_GAIT,
    (t) => ({ x: tibikX(t), z, yaw: tibikTurnAt(t) }),
    TIBIK_TURN_STEPS,
    [-1, WALKS_ON],
  );
});

export const tibikAt = (t: number): TibikFrame => {
  const start = papiertonnenTibikAt(PAPIERTONNEN_LAST_T);
  const pose: Pose = start.pose;
  const turn = kf(t, [1.0, 1.5], [0, 1]);
  const rotationY = tibikTurnAt(t);
  const talking = speaking(t, "tibik");
  const nod = talking ? 0.05 * Math.sin((t - 4.2) * Math.PI * 3) : 0;
  const placed = {
    position: [tibikX(t), start.position[1], start.position[2]] as Vec3,
    rotationY,
    pose: {
      ...pose,
      bob: kf(t, [0, 0.3], [pose.bob, 0]),
      headPitch: kf(t, [0, 0.4], [pose.headPitch, 0]) + nod,
      headYaw: 0,
      headRoll: kf(t, [4.0, 4.3, 5.4, 5.6], [0, 0.12, 0.12, 0]),
      gazeYaw: kf(t, [0.6, 1.0], [0, 0.4]) * (1 - turn),
      gazePitch: 0,
      blink: blinkAt(
        t,
        [0.5, 3.2, 6.3, 9.4, 12.0, 14.6, 17.0, 19.5, 22.9, 26.4],
      ),
    },
  };
  return { ...start, ...placed, pose: plantFeet(tibikGait(), t, placed) };
};

export const kartonAt = (t: number): KartonState => {
  const start = papiertonnenKartonAt(PAPIERTONNEN_LAST_T);
  return {
    ...start,
    position: [
      start.position[0],
      start.position[1] + kf(t, [8.2, 8.6, 12.3, 12.7], [0, 0.03, 0.03, 0]),
      start.position[2],
    ],
  };
};

export type { KarenFrame } from "../../Karen/character";

const RUN_FROM = 6.8;
const BRAKE_AT = 1.4;
const STOP_AT = 2.0;
const RUN_SPEED =
  (RUN_FROM - KAREN_SPOT[0]) / (BRAKE_AT + (STOP_AT - BRAKE_AT) / 2);
const KAREN_FOLLOW = 27.0;
const FOLLOW_SPEED = 0.75;
const FOLLOW_EASE = 1.0;
const followDistance = (t: number) => {
  const u = t - KAREN_FOLLOW;
  if (u <= 0) return 0;
  return u < FOLLOW_EASE
    ? (FOLLOW_SPEED * u * u) / (2 * FOLLOW_EASE)
    : FOLLOW_SPEED * (u - FOLLOW_EASE / 2);
};
const followSpeed = (t: number) =>
  (followDistance(t + 0.005) - followDistance(t - 0.005)) / 0.01;
const karenRunX = (t: number) =>
  t < BRAKE_AT
    ? RUN_FROM - RUN_SPEED * t
    : kf(
        t,
        [BRAKE_AT, STOP_AT],
        [RUN_FROM - RUN_SPEED * BRAKE_AT, KAREN_SPOT[0]],
        Easing.out(Easing.quad),
      );
const karenX = (t: number) =>
  t < KAREN_FOLLOW ? karenRunX(t) : karenRunX(t) - followDistance(t);
const karenRoot: RootAt = (t) => {
  const position: Vec3 = [karenX(t), 0, KAREN_SPOT[2]];
  const tibik: Vec3 =
    t < EXIT_TURN[1] ? TIBIK_SPOT : [tibikX(t), 0, TIBIK_SPOT[2]];
  return { x: position[0], z: position[2], yaw: facing(position, tibik) };
};

export const KAREN_GAIT: GaitStyle = {
  stride: 0.9,
  plantAt: 0.42,
  lift: 0.07,
  heelStrike: 0,
  heelRoll: 0.05,
  toeOff: 0.45,
  toeRoll: 0.09,
};
const KAREN_RUN_TRACK = 0.42;
export const KAREN_WALK_TRACK = 0.3;
const karenSpeed = (t: number) =>
  Math.abs(karenX(t + 0.005) - karenX(t - 0.005)) / 0.01;
const karenSteps = (): Step[] => {
  const running = rhythmicSteps({
    from: -0.7,
    to: 1.7,
    first: 1,
    cadence: (t) => 2.2 + 1.2 * karenSpeed(t),
    overlap: 0.06,
    width: () => KAREN_RUN_TRACK,
  });
  const last = running[running.length - 1];
  return [
    ...running,
    {
      side: opposite(last.side),
      lift: last.land + 0.025,
      land: STOP_AT - 0.14,
    },
    { side: last.side, lift: STOP_AT - 0.07, land: STOP_AT + 0.13 },
    ...rhythmicSteps({
      from: KAREN_FOLLOW,
      to: WALKS_ON,
      first: opposite(last.side),
      cadence: (t) => 1.0 + 1.6 * followSpeed(t),
      overlap: 0.06,
      width: () => KAREN_WALK_TRACK,
    }),
  ];
};
export const karenGait = lazy(() =>
  planGait(KAREN_SKELETON, KAREN_GAIT, karenRoot, karenSteps(), [-1, WALKS_ON]),
);

const POINT_AT_TIBIK: ArmPose = KAREN_ARM_POINT;
const POINT_AT_BOX: ArmPose = { ...KAREN_ARM_POINT, raise: 1.05 };
const POINT_AT_BUILDING: ArmPose = { ...KAREN_ARM_POINT, raise: 2.0, out: 0.2 };

export const karenAt = (t: number): KarenFrame => {
  const root = karenRoot(t);
  const position: Vec3 = [root.x, 0, root.z];
  const running = kf(t, [1.6, 2.0], [1, 0]);
  const walking = kf(t, [KAREN_FOLLOW, KAREN_FOLLOW + 0.6], [0, 1]);
  const step = strideAt(karenGait(), t);
  const yelling = speaking(t, "karen");
  const mouthOpen = yelling
    ? 0.55 + 0.45 * Math.abs(Math.sin(t * Math.PI * 4.5))
    : 0;

  const rightArm =
    t < 2.0
      ? karenRunArm(-step * 0.6 * running)
      : armKf(
          t,
          [
            2.0,
            2.2,
            3.9,
            4.2,
            5.6,
            5.8,
            7.6,
            7.9,
            SHOT_KAREN_THREATENS,
            SHOT_KAREN_THREATENS + 0.3,
            22.0,
            22.3,
            25.8,
            26.1,
          ],
          [
            karenRunArm(0),
            POINT_AT_TIBIK,
            POINT_AT_TIBIK,
            KAREN_ARM_HIPS,
            KAREN_ARM_HIPS,
            POINT_AT_BOX,
            POINT_AT_BOX,
            KAREN_ARM_HIPS,
            KAREN_ARM_HIPS,
            POINT_AT_BUILDING,
            POINT_AT_BUILDING,
            KAREN_ARM_HIPS,
            KAREN_ARM_HIPS,
            POINT_AT_TIBIK,
          ],
        );
  const leftArm =
    t < 2.0
      ? karenRunArm(step * 0.6 * running)
      : t < KAREN_FOLLOW + 0.4
        ? armKf(
            t,
            [2.0, 2.3, KAREN_FOLLOW, KAREN_FOLLOW + 0.4],
            [karenRunArm(0), KAREN_ARM_HIPS, KAREN_ARM_HIPS, karenRunArm(0)],
          )
        : karenRunArm(step * 0.5);

  const pose: Pose = limitKarenHead({
    ...KAREN_REST,
    bob: 0.03 * running,
    lean: 0.15 * running + 0.06 * yellingAmount(t, "karen") + 0.1 * walking,
    sway: step * 0.06 * running + step * 0.05 * walking,
    headRoll: 0.08 * yellingAmount(t, "karen") * Math.sin(t * Math.PI * 3),
    blink: blinkAt(t, [4.6, 8.8, 10.3, 12.2, 14.9, 18.4, 21.0, 24.2, 27.8]),
    leftArm,
    rightArm,
  });

  const placed = { position, rotationY: root.yaw, pose };
  return {
    ...placed,
    pose: plantFeet(karenGait(), t, placed),
    mouthOpen,
    pointing:
      t >= 2.1 &&
      !(t > 3.9 && t < 5.7) &&
      !(t > 7.6 && t < SHOT_KAREN_THREATENS + 0.1) &&
      !(t > 22.1 && t < 25.9),
  };
};

export const karenFootsteps = (fps: number): number[] =>
  touchdownTimes(karenGait(), HAUSMUELL_DURATION, fps);

export const tibikFootsteps = (fps: number): number[] =>
  touchdownTimes(tibikGait(), HAUSMUELL_DURATION, fps);
