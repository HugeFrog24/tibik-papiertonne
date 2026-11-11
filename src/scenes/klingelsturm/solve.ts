import { indoorSolids } from "../../building/flurShape";
import { Quaternion, Vector3, type Matrix4 } from "three";
import { doorFrame } from "../../building/doors";
import {
  TIBIK_DOOR,
  doorbellButtonCenter,
  doorbellSolid,
} from "../../building/stairwell";
import {
  armColliders,
  handSphere,
  bodyColliders,
  torsoMatrix,
} from "../../characters/skeleton";
import { asKaren } from "../../Karen/character";
import { KAREN_SKELETON } from "../../Karen/rig";
import {
  contacts,
  sphereObbGap,
  type Contact,
  type Solid,
} from "../../physics/collision";
import { characterViolations, guardLean } from "../../physics/guards";
import { asCharacter, type TibikFrame } from "../../Tibik/character";
import { LEVER_HOLD, tibikAt, tibikDoorAt, tibikLeverAt } from "./door";
import { lightsAt } from "./light";
import {
  PACKING_HOLDS,
  TAPING_HOLDS,
  parcelClosedAt,
  parcelSolids,
  tapeRollSolid,
} from "./parcel";
import { EXIT_HOLDS, carriedAt } from "./exit";
import { armLimb } from "../../physics/grip";
import { followTheHand, workArm, type Hold } from "../../physics/holds";
import { lazy } from "../../physics/lazy";
import { memoByFrame, memoWithArms } from "../../physics/memoSolve";
import type { ArmHistory } from "../../physics/armHistory";
import type { KarenFrame } from "../hausmuell/choreography";
import { FISHEYE, undistortUv } from "../../toon/fisheye";
import { ashOnTheCigarette, fallenAshAt, type AshPiece } from "./ashTap";
import { FORMATS, TIMELINE_FPS, type Format } from "../../frameRate";
import { CODA, emberGlowAt, flameAmountAt, inHerFingersAt, inHerHands, lighterOut, lightingAt } from "./cigarette";
import { CIGARETTE_HOLD, LIGHTER_HOLD, UP_TO_THE_CIGARETTE_HOLD, cigaretteAt, lighterAt, smokedAt } from "./smoking";
import { BLOW_HOLDS } from "./banging";
import { phoneAt, type PhoneState } from "./calls";
import type { Language } from "../../language";
import type { SceneClock } from "../../sceneClock";
import { KLINGELSTURM_CLOCKS } from "./hold";
import {
  BELL_HOLDS,
  PHONE_HOLDS,
  phoneGrip,
  karenAt,
  phoneObb,
} from "./choreography";

export type KlingelsturmState = {
  readonly karen: KarenFrame;
  readonly tibikDoor: number;
  readonly tibik: TibikFrame;
  readonly tibikLever: number;
  readonly lights: number;
  readonly phone: PhoneState | null;
  readonly parcel: number;
  readonly taping: number;
  readonly carried: boolean;
  readonly cigarette: { readonly frame: Matrix4; readonly burned: number; readonly ash: number; readonly glow: number } | null;
  readonly lighter: { readonly frame: Matrix4; readonly flame: number } | null;
  readonly tibikHere: boolean;
  readonly ash: readonly AshPiece[] | null;
};

const solidsWith = (tibik: number, tibikLever: number): Solid[] => [
  ...indoorSolids({ tibik, tibikLever }),
  doorbellSolid(TIBIK_DOOR),
];
const SHUT_SOLIDS = lazy(() => solidsWith(0, 0));

const solidsAt = (
  door: number,
  lever: number,
  parcel: number,
  taping: number,
  carried: boolean,
) => [
  ...(door === 0 && lever === 0 ? SHUT_SOLIDS() : solidsWith(door, lever)),
  ...(carried ? [tapeRollSolid(taping)] : parcelSolids(parcel, taping)),
];

const solveOn = (clock: SceneClock, language: Language) => (u: number, history: ArmHistory): Omit<KlingelsturmState, "ash"> => {
  const t = clock.storyAt(u);
  const [tibikArms, karenArms] = [history.of("Tibik"), history.of("Karen")];
  const tibikT = Math.min(t, CODA.mediumCut);
  const door = tibikDoorAt(t);
  const lever = tibikLeverAt(t);
  const parcel = parcelClosedAt(t);
  const carried = carriedAt(t);
  const solids = solidsAt(door, lever, parcel, t, carried);
  let tibik = asCharacter(tibikAt(tibikT));
  tibik = workArm(tibik, "leftArm", tibikT, solids, TIBIK_LEFT_HOLDS, { history: tibikArms, at: u });
  tibik = workArm(tibik, "rightArm", tibikT, solids, TIBIK_RIGHT_HOLDS, { history: tibikArms, at: u });
  const authored = karenAt(t, u, language);
  let karen = asKaren(authored);
  karen = guardLean(karen, solids);
  const authoredPhone = phoneAt(t).inHand ? phoneAt(t) : null;
  karen = workArm(karen, "leftArm", t, solids, KAREN_LEFT_HOLDS, { history: karenArms, at: u });
  karen = workArm(karen, "rightArm", t, solids, KAREN_RIGHT_HOLDS, { history: karenArms, at: u });
  const smoking = inHerHands(t);
  const { burned, ash } = smokedAt(t);
  const solved = {
    ...authored,
    position: karen.position,
    rotationY: karen.rotationY,
    pose: karen.pose,
  };
  const phone = authoredPhone && inHandOf(solved, authoredPhone, t);
  return {
    karen: solved,
    tibikDoor: door,
    tibikLever: lever,
    tibik: {
      position: tibik.position,
      rotationY: tibik.rotationY,
      pose: tibik.pose,
      holdingBox: false,
    },
    lights: lightsAt(t),
    phone,
    parcel,
    taping: t,
    carried,
    cigarette: smoking ? { frame: heldCigarette(solved, t), burned, ash, glow: emberGlowAt(t) } : null,
    lighter: lighterOut(t) ? { frame: heldLighter(solved, t), flame: flameAmountAt(t) } : null,
    tibikHere: t < CODA.mediumCut,
  };
};

const rightHandOf = (karen: KarenFrame) => handSphere(KAREN_SKELETON, asKaren(karen), "rightArm").center;


const heldCigarette = (karen: KarenFrame, t: number) =>
  followTheHand(cigaretteAt(t), rightHandOf(karen), CIGARETTE_HOLD.near!(t), inHerFingersAt(t));

const heldLighter = (karen: KarenFrame, t: number) =>
  followTheHand(lighterAt(t), rightHandOf(karen), LIGHTER_HOLD.near!(t), 1 - lightingAt(t));

const solverIn = (language: Language) => {
  const clock = KLINGELSTURM_CLOCKS[language];
  const solveCore = memoWithArms(TIMELINE_FPS, solveOn(clock, language), [clock.editAt(CODA.jumpCut)]);
  const releaseAt = memoByFrame((off: number) => {
    const { frame, burned } = solveCore(clock.editAt(off)).cigarette!;
    const flicked = (t: number) => ashOnTheCigarette(cigaretteAt(t), smokedAt(t).burned).center;
    return { ...ashOnTheCigarette(frame, burned), velocity: flicked(off).sub(flicked(off - 1 / TIMELINE_FPS)).multiplyScalar(TIMELINE_FPS) };
  });
  const solveWithAsh = memoByFrame((u: number): KlingelsturmState => {
    const t = clock.storyAt(u);
    return { ...solveCore(u), ash: t < CODA.ashOff ? null : fallenAshAt(t, releaseAt(CODA.ashOff)) };
  });
  return Object.assign((u: number) => solveWithAsh(u), {
    clear: () => { [solveWithAsh, solveCore, releaseAt].forEach((memo) => { memo.clear(); }); },
  });
};

export const TIBIK_LEFT_HOLDS: readonly Hold[] = [...PACKING_HOLDS, LEVER_HOLD, ...TAPING_HOLDS, ...EXIT_HOLDS];
export const TIBIK_RIGHT_HOLDS: readonly Hold[] = [...PACKING_HOLDS, ...TAPING_HOLDS, ...EXIT_HOLDS];
export const KAREN_LEFT_HOLDS: readonly Hold[] = [...BELL_HOLDS, ...BLOW_HOLDS];
export const KAREN_RIGHT_HOLDS: readonly Hold[] = [...PHONE_HOLDS, LIGHTER_HOLD, UP_TO_THE_CIGARETTE_HOLD, CIGARETTE_HOLD];

const SOLVERS: Readonly<Record<Language, ReturnType<typeof solverIn>>> = { de: solverIn("de"), en: solverIn("en") };

export const solveKlingelsturmIn = (language: Language) => SOLVERS[language];

export const solveKlingelsturm = SOLVERS.de;

export const klingelsturmSolids = (state: KlingelsturmState): Solid[] =>
  solidsAt(
    state.tibikDoor,
    state.tibikLever,
    state.parcel,
    state.taping,
    state.carried,
  );

export const klingelsturmViolations = (state: KlingelsturmState): Contact[] =>
  characterViolations(asKaren(state.karen), klingelsturmSolids(state));

export const tibikViolations = (state: KlingelsturmState): Contact[] =>
  characterViolations(asCharacter(state.tibik), klingelsturmSolids(state));

const karenHand = (
  state: KlingelsturmState,
  arm: "leftArm" | "rightArm" = "leftArm",
) => handSphere(KAREN_SKELETON, asKaren(state.karen), arm);

export const handOf = (state: KlingelsturmState) =>
  karenHand(state).center.clone();

export const buttonCenter = () =>
  new Vector3(...doorbellButtonCenter(TIBIK_DOOR)).applyMatrix4(
    doorFrame(TIBIK_DOOR, 0),
  );

export const bellGap = (state: KlingelsturmState) =>
  sphereObbGap(karenHand(state), doorbellSolid(TIBIK_DOOR));

export const throughLens = ([x, y]: [number, number], format: Format = "wide"): [number, number] => {
  const { width, height } = FORMATS[format];
  const [u, v] = undistortUv([x / width, 1 - y / height], width / height, FISHEYE.halfAngle, FISHEYE.raise[format]);
  return [u * width, (1 - v) * height];
};

export const phoneGap = (state: KlingelsturmState) =>
  state.phone === null
    ? Infinity
    : sphereObbGap(
        karenHand(state, "rightArm"),
        phoneObb(state.karen, state.phone),
      );

const inHandOf = (
  karen: KarenFrame,
  phone: PhoneState,
  t: number,
): PhoneState => {
  const arm = armColliders(KAREN_SKELETON, asKaren(karen), "rightArm");
  const miss = arm[arm.length - 1].center
    .clone()
    .sub(phoneGrip(karen, phone, t));
  const turn = new Quaternion();
  torsoMatrix(KAREN_SKELETON, karen).decompose(new Vector3(), turn, new Vector3());
  const local = miss.applyQuaternion(turn.invert());
  const [x, y, z] = phone.position;
  return { ...phone, position: [x + local.x, y + local.y, z + local.z] };
};

export const phoneViolations = (state: KlingelsturmState): Contact[] => {
  if (state.phone === null) return [];
  const body = bodyColliders(KAREN_SKELETON, asKaren(state.karen));
  const notHolding = [
    ...body.torso,
    ...body.head,
    ...body.legs,
    ...body.leftArm,
  ];
  const holdingArm = armLimb(
    armColliders(KAREN_SKELETON, asKaren(state.karen), "rightArm"),
  );
  const landing = klingelsturmSolids(state);
  const phone = contacts(
    [phoneObb(state.karen, state.phone)],
    [...landing, ...notHolding, ...holdingArm],
  );
  return phone;
};

