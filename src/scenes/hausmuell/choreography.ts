import { Easing } from "remotion";
import { armKf, blinkAt, kf } from "../../characters/animate";
import {
  planGait,
  plantFeet,
  rhythmicSteps,
  strideAt,
  type GaitPlan,
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
  PAPIERTONNEN_DURATION,
  kartonAt as papiertonnenKartonAt,
  tibikAt as papiertonnenTibikAt,
  tibikGait as papiertonnenTibikGait,
  type KartonState,
  type TibikFrame,
} from "../papiertonnen/choreography";
import { RIG } from "../../Tibik/rig";
import type { Vec3 } from "../../toon/primitives";

export const HAUSMUELL_DURATION = 16;

export const SHOT_KAREN_YELLS = 2.0;
export const SHOT_TIBIK_ASKS = 4.0;
export const SHOT_KAREN_ACCUSES = 5.6;
export const SHOT_TIBIK_EXPLAINS = 7.8;
export const SHOT_KAREN_THREATENS = 13.0;

export type Line = {
  readonly speaker: "karen" | "tibik";
  readonly from: number;
  readonly to: number;
  readonly text: string;
};

export const LINES: readonly Line[] = [
  { speaker: "karen", from: 2.1, to: 3.9, text: "DAS DÜRFEN SIE NICHT!!!!" },
  { speaker: "tibik", from: 4.2, to: 5.5, text: "Was darf ich nicht?" },
  { speaker: "karen", from: 5.7, to: 7.6, text: "SIE KLAUEN DEN HAUSMÜLL!" },
  { speaker: "tibik", from: 7.9, to: 9.9, text: "Ich verwende den Karton nur wieder." },
  { speaker: "tibik", from: 10.1, to: 12.7, text: "Das spart einen neuen und schont die Umwelt." },
  { speaker: "karen", from: 13.1, to: 15.6, text: "ICH MELDE SIE DER HAUSVERWALTUNG!" },
];

const speaking = (t: number, speaker: Line["speaker"]) =>
  LINES.some((l) => l.speaker === speaker && t >= l.from && t <= l.to);

export const TIBIK_SPOT: Vec3 = [1.4, 0, -0.7];
export const KAREN_SPOT: Vec3 = [3.05, 0, -0.35];
export const facing = (from: Vec3, to: Vec3) => Math.atan2(to[0] - from[0], to[2] - from[2]);

const PAPIERTONNEN_LAST = PAPIERTONNEN_DURATION - 1 / 30;

const tibikTurnAt = (t: number) => {
  const start = papiertonnenTibikAt(PAPIERTONNEN_LAST);
  const turn = kf(t, [1.0, 1.5], [0, 1]);
  return start.rotationY + (facing(start.position, KAREN_SPOT) - start.rotationY) * turn;
};
const TIBIK_TURN_STEPS: Step[] = [
  { side: 1, lift: 1.0, land: 1.22 },
  { side: -1, lift: 1.25, land: 1.47 },
];
let tibikPlan: GaitPlan | null = null;
export const tibikGait = () => {
  if (!tibikPlan) {
    const [x, , z] = papiertonnenTibikAt(PAPIERTONNEN_LAST).position;
    tibikPlan = planGait(RIG, papiertonnenTibikGait().style, (t) => ({ x, z, yaw: tibikTurnAt(t) }), TIBIK_TURN_STEPS, [-1, HAUSMUELL_DURATION]);
  }
  return tibikPlan;
};

export const tibikAt = (t: number): TibikFrame => {
  const start = papiertonnenTibikAt(PAPIERTONNEN_LAST);
  const pose: Pose = start.pose;
  const turn = kf(t, [1.0, 1.5], [0, 1]);
  const rotationY = tibikTurnAt(t);
  const talking = speaking(t, "tibik");
  const nod = talking ? 0.05 * Math.sin((t - 4.2) * Math.PI * 3) : 0;
  const placed = {
    position: start.position,
    rotationY,
    pose: {
      ...pose,
      bob: kf(t, [0, 0.3], [pose.bob, 0]),
      headPitch: kf(t, [0, 0.4], [pose.headPitch, 0]) + nod,
      headYaw: 0,
      headRoll: kf(t, [4.0, 4.3, 5.4, 5.6], [0, 0.12, 0.12, 0]),
      gazeYaw: kf(t, [0.6, 1.0], [0, 0.4]) * (1 - turn),
      gazePitch: 0,
      blink: blinkAt(t, [0.5, 3.2, 6.3, 9.4, 12.0, 14.6]),
    },
  };
  return { ...start, ...placed, pose: plantFeet(tibikGait(), t, placed) };
};

export const kartonAt = (t: number): KartonState => {
  const start = papiertonnenKartonAt(PAPIERTONNEN_LAST);
  return {
    ...start,
    position: [start.position[0], start.position[1] + kf(t, [8.2, 8.6, 12.3, 12.7], [0, 0.03, 0.03, 0]), start.position[2]],
  };
};

export type KarenFrame = {
  readonly position: Vec3;
  readonly rotationY: number;
  readonly pose: Pose;
  readonly mouthOpen: number;
  readonly pointing: boolean;
};

const RUN_FROM = 6.8;
const BRAKE_AT = 1.4;
const STOP_AT = 2.0;
const RUN_SPEED = (RUN_FROM - KAREN_SPOT[0]) / (BRAKE_AT + (STOP_AT - BRAKE_AT) / 2);
const karenX = (t: number) =>
  t < BRAKE_AT
    ? RUN_FROM - RUN_SPEED * t
    : kf(t, [BRAKE_AT, STOP_AT], [RUN_FROM - RUN_SPEED * BRAKE_AT, KAREN_SPOT[0]], Easing.out(Easing.quad));
const karenRoot: RootAt = (t) => {
  const position: Vec3 = [karenX(t), 0, KAREN_SPOT[2]];
  return { x: position[0], z: position[2], yaw: facing(position, TIBIK_SPOT) };
};

const KAREN_GAIT: GaitStyle = { stride: 0.9, plantAt: 0.42, lift: 0.07, heelStrike: 0, heelRoll: 0.05, toeOff: 0.45, toeRoll: 0.09 };
const KAREN_RUN_TRACK = 0.42;
const karenSpeed = (t: number) => Math.abs(karenX(t + 0.005) - karenX(t - 0.005)) / 0.01;
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
    { side: last.side === 1 ? -1 : 1, lift: last.land + 0.025, land: STOP_AT - 0.14 },
    { side: last.side, lift: STOP_AT - 0.07, land: STOP_AT + 0.13 },
  ];
};
let karenPlan: GaitPlan | null = null;
export const karenGait = () => (karenPlan ??= planGait(KAREN_SKELETON, KAREN_GAIT, karenRoot, karenSteps(), [-1, HAUSMUELL_DURATION]));

const POINT_AT_TIBIK: ArmPose = KAREN_ARM_POINT;
const POINT_AT_BOX: ArmPose = { ...KAREN_ARM_POINT, raise: 1.05 };
const POINT_AT_BUILDING: ArmPose = { ...KAREN_ARM_POINT, raise: 2.0, out: 0.2 };

export const karenAt = (t: number): KarenFrame => {
  const root = karenRoot(t);
  const position: Vec3 = [root.x, 0, root.z];
  const running = kf(t, [1.6, 2.0], [1, 0]);
  const step = strideAt(karenGait(), t);
  const yelling = speaking(t, "karen");
  const mouthOpen = yelling ? 0.55 + 0.45 * Math.abs(Math.sin(t * Math.PI * 4.5)) : 0;

  const rightArm =
    t < 2.0
      ? karenRunArm(-step * 0.6 * running)
      : armKf(
          t,
          [2.0, 2.2, 3.9, 4.2, 5.6, 5.8, 7.6, 7.9, SHOT_KAREN_THREATENS, SHOT_KAREN_THREATENS + 0.3],
          [karenRunArm(0), POINT_AT_TIBIK, POINT_AT_TIBIK, KAREN_ARM_HIPS, KAREN_ARM_HIPS, POINT_AT_BOX, POINT_AT_BOX, KAREN_ARM_HIPS, KAREN_ARM_HIPS, POINT_AT_BUILDING],
        );
  const leftArm = t < 2.0 ? karenRunArm(step * 0.6 * running) : armKf(t, [2.0, 2.3], [karenRunArm(0), KAREN_ARM_HIPS]);

  const pose: Pose = limitKarenHead({
    ...KAREN_REST,
    bob: 0.03 * running,
    lean: 0.15 * running + (yelling ? 0.06 : 0),
    sway: step * 0.06 * running,
    headRoll: yelling ? 0.08 * Math.sin(t * Math.PI * 3) : 0,
    blink: blinkAt(t, [4.6, 8.8, 10.3, 12.2, 14.9]),
    leftArm,
    rightArm,
  });

  const placed = { position, rotationY: root.yaw, pose };
  return {
    ...placed,
    pose: plantFeet(karenGait(), t, placed),
    mouthOpen,
    pointing: t >= 2.1 && !(t > 3.9 && t < 5.7) && !(t > 7.6 && t < SHOT_KAREN_THREATENS + 0.1),
  };
};

const landings = (plan: GaitPlan, fps: number) =>
  plan.touchdowns.filter((s) => s.time >= 0 && s.time < HAUSMUELL_DURATION).map((s) => Math.round(s.time * fps) / fps);

export const karenFootsteps = (fps: number): number[] => landings(karenGait(), fps);

export const tibikFootsteps = (fps: number): number[] => landings(tibikGait(), fps);
