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
import type { Line } from "../../dialogue/line";
import { mouthInWorld, onScreen, seenBy } from "../../dialogue/screen";
import type { CameraSetup } from "../../toon/shots";
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
import { RIG } from "../../Tibik/rig";
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
import { followTheHand, workArm } from "../../physics/holds";
import { lazy } from "../../physics/lazy";
import { memoByFrame } from "../../physics/memoSolve";
import type { KarenFrame } from "../hausmuell/choreography";
import { FISHEYE, undistortUv } from "../../toon/fisheye";
import { FRAME, cameraAt, shotAt } from "./cameras";
import { ashOnTheCigarette, fallenAshAt, type AshPiece } from "./ashTap";
import { FPS } from "../../frameRate";
import { CODA, emberGlowAt, flameAmountAt, inHerFingersAt, inHerHands, lighterOut, lightingAt } from "./cigarette";
import { CIGARETTE_HOLD, LIGHTER_HOLD, cigaretteAt, lighterAt, smokedAt } from "./smoking";
import { BLOW_HOLDS } from "./banging";
import { phoneAt, type PhoneState } from "./calls";
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

const solve = (t: number): Omit<KlingelsturmState, "ash"> => {
  const tibikT = Math.min(t, CODA.mediumCut);
  const door = tibikDoorAt(t);
  const lever = tibikLeverAt(t);
  const parcel = parcelClosedAt(t);
  const carried = carriedAt(t);
  const solids = solidsAt(door, lever, parcel, t, carried);
  let tibik = asCharacter(tibikAt(tibikT));
  tibik = workArm(tibik, "leftArm", tibikT, solids, [
    ...PACKING_HOLDS,
    LEVER_HOLD,
    ...TAPING_HOLDS,
    ...EXIT_HOLDS,
  ]);
  tibik = workArm(tibik, "rightArm", tibikT, solids, [
    ...PACKING_HOLDS,
    ...TAPING_HOLDS,
    ...EXIT_HOLDS,
  ]);
  const authored = karenAt(t);
  let karen = asKaren(authored);
  karen = guardLean(karen, solids);
  const authoredPhone = phoneAt(t).inHand ? phoneAt(t) : null;
  karen = workArm(karen, "leftArm", t, solids, [...BELL_HOLDS, ...BLOW_HOLDS]);
  karen = workArm(karen, "rightArm", t, solids, [...PHONE_HOLDS, LIGHTER_HOLD, CIGARETTE_HOLD]);
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

const solveCore = memoByFrame(solve);

const ashRelease = lazy(() => {
  const at = (t: number) => {
    const { frame, burned } = solveCore(t).cigarette!;
    return ashOnTheCigarette(frame, burned);
  };
  const now = at(CODA.ashOff);
  return { ...now, velocity: now.center.clone().sub(at(CODA.ashOff - 1 / FPS).center).multiplyScalar(FPS) };
});

export const solveKlingelsturm = memoByFrame((t: number): KlingelsturmState => ({
  ...solveCore(t),
  ash: t < CODA.ashOff ? null : fallenAshAt(t, ashRelease()),
}));

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

const throughLens = ([x, y]: [number, number]): [number, number] => {
  const [u, v] = undistortUv(
    [x / FRAME.width, 1 - y / FRAME.height],
    FRAME.width / FRAME.height,
    FISHEYE.strength,
  );
  return [u * FRAME.width, (1 - v) * FRAME.height];
};

const CROWN_ABOVE_MOUTH = new Vector3(0, 0.2, 0);

export const karenVoice = (state: KlingelsturmState, setup: CameraSetup) => {
  const mouth = mouthInWorld(KAREN_SKELETON, state.karen);
  if (seenBy(mouth, setup)) return mouth;
  return mouth.clone().add(CROWN_ABOVE_MOUTH);
};

export const tailTo = (line: Line, t: number): [number, number] | null => {
  const spyhole = shotAt(t).name === "Spyhole";
  if (spyhole && line.speaker === "tibik") return null;
  const state = solveKlingelsturm(t);
  if (line.speaker === "phone" && state.phone === null) return null;
  const point =
    line.speaker === "karen"
      ? karenVoice(state, cameraAt(t))
      : line.speaker === "phone" && state.phone
        ? phoneObb(state.karen, state.phone).center
        : mouthInWorld(RIG, state.tibik);
  const projected = onScreen(point, cameraAt(t));
  return spyhole ? throughLens(projected) : projected;
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

