import { Easing } from "remotion";
import { armAroundKf, blinkAt, kf } from "../../characters/animate";
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
import { PUZZLED_TILT, RIG } from "../../Tibik/rig";
import { TIBIK_GAIT } from "../../Tibik/character";
import { lazy } from "../../physics/lazy";
import { inWindow, wrapAngle } from "../../characters/scalar";
import { throughArm } from "../../physics/armDescent";
import { bendAround } from "../../characters/gesture";
import type { Vec3 } from "../../toon/primitives";
import { speakingAmountIn, speakingIn, type Line } from "../../dialogue/line";
import { mouthLeads, spokenSpans } from "../../dialogue/voiced";
import { byLanguage, type Language } from "../../language";
import type { KarenFrame } from "../../Karen/character";

export const HAUSMUELL_DURATION = 26.8;
const WALKS_ON = HAUSMUELL_DURATION + 2;

export const SHOT_KAREN_YELLS = 1.35;
export const SHOT_TIBIK_ASKS = 2.3;
export const SHOT_KAREN_ACCUSES = 3.9;
export const SHOT_TIBIK_EXPLAINS = 6.1;
export const SHOT_KAREN_THREATENS = 11.3;
export const SHOT_TIBIK_WHO = 14.3;
export const SHOT_KAREN_NAMES = 15.8;
export const SHOT_TIBIK_WEISUNG = 18.3;
export const SHOT_KAREN_WIE = 20.5;
export const SHOT_EXIT = 21.9;

export const LINES: readonly Line[] = [
  {
    speaker: "karen",
    from: 0.4,
    to: 2.3,
    text: "SIE DÜRFEN DAS NICHT!!!!",
    name: "Karen: Sie dürfen das nicht",
    tone: "shout",
  },
  {
    speaker: "tibik",
    from: 2.5,
    to: 3.8,
    text: "Was darf ich nicht?",
    name: "Tibik: Was darf ich nicht?",
    tone: "calm",
  },
  {
    speaker: "karen",
    from: 4,
    to: 5.9,
    text: "SIE KLAUEN DEN HAUSMÜLL!",
    name: "Karen: Sie klauen den Hausmüll",
    tone: "shout",
  },
  {
    speaker: "tibik",
    from: 6.2,
    to: 8.2,
    text: "Ich verwende den Karton nur wieder.",
    name: "Tibik: Karton wiederverwenden",
    tone: "calm",
  },
  {
    speaker: "tibik",
    from: 8.4,
    to: 11,
    text: "Das spart einen neuen und schont die Umwelt.",
    name: "Tibik: Umweltschutz",
    tone: "calm",
  },
  {
    speaker: "karen",
    from: 11.4,
    to: 13.9,
    text: "ICH MELDE SIE DER HAUSVERWALTUNG!",
    name: "Karen: Hausverwaltung",
    tone: "shout",
  },
  {
    speaker: "tibik",
    from: 14.3,
    to: 15.7,
    text: "Wer sind Sie überhaupt?",
    name: "Tibik: Wer sind Sie",
    tone: "calm",
  },
  {
    speaker: "karen",
    from: 15.85,
    to: 16.7,
    text: "SCHULZ!",
    name: "Karen: Schulz",
    tone: "shout",
  },
  {
    speaker: "karen",
    from: 16.7,
    to: 18.3,
    text: "ICH WOHNE IHNEN GEGENÜBER!",
    name: "Karen: Gegenüber",
    tone: "shout",
  },
  {
    speaker: "tibik",
    from: 18.4,
    to: 20.5,
    text: "Haben Sie eine Weisungsbefugnis?",
    name: "Tibik: Weisungsbefugnis",
    tone: "calm",
  },
  {
    speaker: "karen",
    from: 20.6,
    to: 21.7,
    text: "…WIE BITTE?!",
    name: "Karen: Wie bitte",
    tone: "shout",
  },
  {
    speaker: "tibik",
    from: 22,
    to: 24.8,
    text: "Schönen Tag noch, Frau Schulz.",
    name: "Tibik: Schönen Tag noch",
    tone: "calm",
  },
  {
    speaker: "karen",
    from: 25,
    to: 26.6,
    text: "DAS HAT EIN NACHSPIEL!",
    name: "Karen: Nachspiel",
    tone: "shout",
  },
];

const ACTING = byLanguage((language) => {
  const voiced = mouthLeads(spokenSpans("hausmuell", LINES, language));
  return { speaking: speakingIn(LINES, voiced), yellingAmount: speakingAmountIn(LINES, voiced) };
});

export const TIBIK_SPOT: Vec3 = [1.4, 0, -0.7];
export const KAREN_SPOT: Vec3 = [3.05, 0, -0.35];
export const facing = (from: Vec3, to: Vec3) =>
  Math.atan2(to[0] - from[0], to[2] - from[2]);

const EXIT_TURN: readonly [number, number] = [22.9, 23.5];
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

const LEAVING: readonly [number, number] = [0.2, 0.55];
const AWAY = 1.5;
const BACK_TO_HER: readonly [number, number] = [0.75, 1.3];

const tibikTurnAt = (t: number) => {
  const start = papiertonnenTibikAt(PAPIERTONNEN_LAST_T);
  const away =
    start.rotationY + AWAY * Math.sign(wrapAngle(EXIT_YAW - start.rotationY));
  const towardsKaren = facing(start.position, KAREN_SPOT);
  return (
    start.rotationY +
    (away - start.rotationY) * kf(t, LEAVING, [0, 1]) +
    (towardsKaren - away) * kf(t, BACK_TO_HER, [0, 1]) +
    (EXIT_YAW - towardsKaren) * kf(t, EXIT_TURN, [0, 1])
  );
};
const TIBIK_TURN_STEPS: Step[] = [
  { side: -1, lift: LEAVING[0], land: 0.42 },
  { side: 1, lift: 0.4, land: 0.66 },
  { side: -1, lift: 0.78, land: 1.0 },
  { side: 1, lift: 1.03, land: 1.25 },
  { side: -1, lift: 1.25, land: 1.42 },
  { side: 1, lift: 23.0, land: 23.22 },
  { side: -1, lift: 23.25, land: 23.48 },
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

export const tibikAt = (t: number, language: Language = "de"): TibikFrame => {
  const { speaking } = ACTING[language];
  const start = papiertonnenTibikAt(PAPIERTONNEN_LAST_T);
  const pose: Pose = start.pose;
  const turn = kf(t, BACK_TO_HER, [0, 1]);
  const rotationY = tibikTurnAt(t);
  const talking = speaking(t, "tibik");
  const nod = talking ? 0.05 * Math.sin((t - 2.5) * Math.PI * 3) : 0;
  const placed = {
    position: [tibikX(t), start.position[1], start.position[2]] as Vec3,
    rotationY,
    pose: {
      ...pose,
      bob: kf(t, [0, 0.3], [pose.bob, 0]),
      headPitch: kf(t, [0, 0.4], [pose.headPitch, 0]) + nod,
      headYaw: 0,
      headRoll: kf(t, [2.3, 2.6, 3.7, 3.9], [0, PUZZLED_TILT, PUZZLED_TILT, 0]),
      gazeYaw: kf(t, [0.4, 0.55], [0, 0.6]) * (1 - turn),
      gazePitch: kf(t, [0, 0.3], [pose.gazePitch, 0]),
      blink: blinkAt(
        t,
        [1.5, 4.6, 7.7, 10.3, 12.9, 15.3, 17.8, 21.2, 24.7],
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
      start.position[1] + kf(t, [6.5, 6.9, 10.6, 11.0], [0, 0.03, 0.03, 0]),
      start.position[2],
    ],
  };
};

export type { KarenFrame } from "../../Karen/character";

const RUN_FROM = 5.8;
const BRAKE_AT = 0.7;
export const STOP_AT = 1.3;
const RUN_SPEED =
  (RUN_FROM - KAREN_SPOT[0]) / (BRAKE_AT + (STOP_AT - BRAKE_AT) / 2);
export const KAREN_FOLLOW = 25.3;
const OFF_HER_HIP = 0.4;
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
        Easing.out((k) => Easing.quad(k)),
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
    to: STOP_AT - 0.3,
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

const AROUND_HER = {
  leftArm: bendAround(KAREN_SKELETON, KAREN_REST, "leftArm"),
  rightArm: bendAround(KAREN_SKELETON, KAREN_REST, "rightArm"),
};

const POINT_AT_TIBIK: ArmPose = KAREN_ARM_POINT;
const POINT_AT_BOX: ArmPose = { ...KAREN_ARM_POINT, raise: 1.05 };
const POINT_AT_BUILDING: ArmPose = { ...KAREN_ARM_POINT, raise: 2.0, out: 0.4 };

export const karenAt = (t: number, language: Language = "de"): KarenFrame => {
  const { speaking, yellingAmount } = ACTING[language];
  const root = karenRoot(t);
  const position: Vec3 = [root.x, 0, root.z];
  const running = kf(t, [STOP_AT - 0.4, STOP_AT], [1, 0]);
  const walking = kf(t, [KAREN_FOLLOW, KAREN_FOLLOW + 0.6], [0, 1]);
  const step = strideAt(karenGait(), t);
  const yelling = speaking(t, "karen");
  const mouthOpen = yelling
    ? 0.55 + 0.45 * Math.abs(Math.sin(t * Math.PI * 4.5))
    : 0;

  const rightArm =
    t < STOP_AT
      ? karenRunArm(-step * 0.6 * running)
      : armAroundKf(
          t,
          [
            STOP_AT,
            STOP_AT + 0.2,
            2.2,
            2.5,
            3.9,
            4.1,
            5.9,
            6.2,
            SHOT_KAREN_THREATENS,
            SHOT_KAREN_THREATENS + 0.3,
            20.3,
            20.6,
            24.1,
            24.4,
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
          AROUND_HER.rightArm,
        );
  const leftArm =
    t < STOP_AT
      ? karenRunArm(step * 0.6 * running)
      : t < KAREN_FOLLOW
        ? armAroundKf(t, [STOP_AT, STOP_AT + 0.3], [karenRunArm(0), KAREN_ARM_HIPS], AROUND_HER.leftArm)
        : throughArm(KAREN_ARM_HIPS, AROUND_HER.leftArm(KAREN_ARM_HIPS, karenRunArm(0)), karenRunArm(step * 0.5), inWindow(t, [KAREN_FOLLOW, KAREN_FOLLOW + OFF_HER_HIP]));

  const pose: Pose = limitKarenHead({
    ...KAREN_REST,
    bob: 0.03 * running,
    lean: 0.15 * running + 0.06 * yellingAmount(t, "karen") + 0.1 * walking,
    sway: step * 0.06 * running + step * 0.05 * walking,
    headRoll: 0.08 * yellingAmount(t, "karen") * Math.sin(t * Math.PI * 3),
    blink: blinkAt(t, [2.9, 7.1, 8.6, 10.5, 13.2, 16.7, 19.3, 22.5, 26.1]),
    leftArm,
    rightArm,
  });

  const placed = { position, rotationY: root.yaw, pose };
  return {
    ...placed,
    pose: plantFeet(karenGait(), t, placed),
    mouthOpen,
    pointing:
      t >= STOP_AT + 0.1 &&
      !(t > 2.2 && t < 4.0) &&
      !(t > 5.9 && t < SHOT_KAREN_THREATENS + 0.1) &&
      !(t > 20.4 && t < 24.2),
  };
};

export const karenFootsteps = (): number[] =>
  touchdownTimes(karenGait(), HAUSMUELL_DURATION);

export const tibikFootsteps = (): number[] =>
  touchdownTimes(tibikGait(), HAUSMUELL_DURATION);
