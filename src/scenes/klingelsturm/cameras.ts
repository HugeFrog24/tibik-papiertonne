import { TIBIK_DOOR, doorbellButtonCenter } from "../../building/stairwell";
import { viewerLens, type Door } from "../../building/doors";
import { FRAME_SIZE } from "../../dialogue/screen";
import { floorLevel } from "../../street/building";
import type { Vec3 } from "../../toon/primitives";
import { camerasOf, storyTimeIn, type CameraSetup, type Shot } from "../../toon/shots";
import { karenMouthEmitter } from "../../Karen/mouthEmitter";
import { CODA, cigaretteFrame } from "./cigarette";
import { cigaretteTip } from "../../props/cigaretteShape";
import { STORY_SKIP } from "./light";
import { Vector3 } from "three";
import { lazy } from "../../physics/lazy";
import { doorFrame } from "../../building/doors";
import { mouthInWorld } from "../../dialogue/screen";
import { RIG } from "../../Tibik/rig";
import { BANGING } from "./banging";
import { CLICK, KEYS, POCKET } from "./calls";
import { AJAR_ANGLE, tibikAt } from "./door";
import { TAPING, parcelBody } from "./parcel";
import { KLINGELSTURM_DURATION, karenAt } from "./choreography";

export const FRAME = FRAME_SIZE;

const FLOOR = floorLevel(1);
const lensOf = (door: Door): Vec3 => viewerLens(door).toArray() as Vec3;

const WIDE: CameraSetup = {
  position: [-1.2, FLOOR + 1.6, -7.8],
  target: [-3.0, FLOOR + 1.0, -9.15],
  fov: 50,
};

const CODA_WIDE: CameraSetup = {
  ...WIDE,
  target: [-2.09, FLOOR + 1.0, -9.13],
};

export const SPYHOLE: CameraSetup = {
  position: lensOf(TIBIK_DOOR),
  target: [-2.6, FLOOR + 1.25, -9.2],
  fov: 100,
};

const PHONE_EYE: Vec3 = [-1.5, FLOOR + 1.6, -7.7];
const PHONE_AIM = 1.35;
const PHONE_LEAD = 0.4;

const PHONE_SHOT = (t: number): CameraSetup => {
  const [x, , z] = karenAt(t).position;
  return {
    position: PHONE_EYE,
    target: [x + PHONE_LEAD, FLOOR + PHONE_AIM, z],
    fov: 44,
  };
};

const GAP_SHOT = lazy((): CameraSetup => {
  const mouth = mouthInWorld(RIG, tibikAt(12));
  const atMouth = (angle: number) =>
    new Vector3(TIBIK_DOOR.width, 0, 0)
      .applyMatrix4(doorFrame(TIBIK_DOOR, angle))
      .setY(mouth.y);
  const jamb = atMouth(0);
  const gap = new Vector3(
    jamb.x,
    mouth.y,
    (atMouth(AJAR_ANGLE).z + jamb.z) / 2,
  );
  const out = gap.clone().sub(mouth).setY(0).normalize();
  const eye = gap
    .clone()
    .addScaledVector(out, 1.1)
    .add(new Vector3(0, 0.55, 0));
  return {
    position: [eye.x, eye.y, eye.z],
    target: [mouth.x, mouth.y, mouth.z],
    fov: 38,
  };
});

const SMOKING_FOV = 32;

const ON_HER_LATER = lazy((): CameraSetup => {
  const mouth = karenMouthEmitter(karenAt(CODA.outAgain)).origin;
  return { ...CODA_WIDE, target: [mouth.x, mouth.y, mouth.z] };
});

const AT_HER_MOUTH = lazy((): CameraSetup => {
  const karen = karenAt(CODA.flick);
  const between = karenMouthEmitter(karen).origin.lerp(cigaretteTip(cigaretteFrame(karen), 0), 0.5);
  return { position: PHONE_EYE, target: [between.x, between.y, between.z], fov: SMOKING_FOV };
});

const DIALLING: readonly [number, number] = [
  KEYS[1].at - 0.15,
  KEYS[KEYS.length - 1].at + 0.3,
];
const FLUR_CUT: readonly [number, number] = [2.4, 4.6];
const BELL_CUT = 1.2;
const BELL_EYE = new Vector3(0.3, 0.45, 0.35);

const BELL_INSERT = lazy((): CameraSetup => {
  const button = new Vector3(...doorbellButtonCenter(TIBIK_DOOR)).applyMatrix4(
    doorFrame(TIBIK_DOOR, 0),
  );
  const eye = button.clone().add(BELL_EYE);
  return {
    position: [eye.x, eye.y, eye.z],
    target: [button.x, button.y, button.z],
    fov: 30,
  };
});

const TAPING_CUT: readonly [number, number] = [
  TAPING.pick - 0.15,
  TAPING.down - 0.05,
];

const FLUR_SHOT: CameraSetup = {
  position: [-5.2, FLOOR + 1.4, -10.05],
  target: [-4.3, FLOOR + 1.5, -8.7],
  fov: 62,
};

const FLUR_ON_THE_PARCEL = lazy((): CameraSetup => {
  const between = parcelBody()
    .center.clone()
    .lerp(mouthInWorld(RIG, tibikAt(BANGING.flurCut[0])), 0.5);
  return { ...FLUR_SHOT, target: [between.x, between.y, between.z] };
});

export const SHOTS: readonly Shot[] = [
  { name: "Wide: Klingelsturm", from: 0, to: BELL_CUT, at: () => WIDE },
  {
    name: "Insert: the bell",
    from: BELL_CUT,
    to: FLUR_CUT[0],
    at: BELL_INSERT,
  },
  {
    name: "Flur: packing",
    from: FLUR_CUT[0],
    to: FLUR_CUT[1],
    at: () => FLUR_SHOT,
  },
  { name: "Wide: still ringing", from: FLUR_CUT[1], to: 6.0, at: () => WIDE },
  { name: "Spyhole", from: 6.0, to: 9.0, at: () => SPYHOLE },
  { name: "Over Karen: the gap", from: 9.0, to: POCKET[1], at: GAP_SHOT },
  {
    name: "Medium: the phone",
    from: POCKET[1],
    to: TAPING_CUT[0],
    at: PHONE_SHOT,
  },
  {
    name: "Flur: taping",
    from: TAPING_CUT[0],
    to: TAPING_CUT[1],
    at: () => FLUR_SHOT,
  },
  {
    name: "Medium: the answering machine",
    from: TAPING_CUT[1],
    to: BANGING.wideCut,
    at: PHONE_SHOT,
  },
  {
    name: "Wide: the banging",
    from: BANGING.wideCut,
    to: BANGING.flurCut[0],
    at: () => WIDE,
  },
  {
    name: "Flur: the banging",
    from: BANGING.flurCut[0],
    to: BANGING.flurCut[1],
    at: FLUR_ON_THE_PARCEL,
  },
  {
    name: "Medium: back to the phone",
    from: BANGING.flurCut[1],
    to: DIALLING[1],
    at: PHONE_SHOT,
  },
  {
    name: "Medium: the police",
    from: DIALLING[1],
    to: CLICK,
    at: PHONE_SHOT,
  },
  {
    name: "Wide: the light goes out",
    from: CLICK,
    to: CODA.mediumCut,
    at: () => CODA_WIDE,
  },
  {
    name: "Close-up: the cigarette",
    from: CODA.mediumCut,
    to: CODA.jumpCut,
    at: AT_HER_MOUTH,
  },
  {
    name: "Wide: later",
    from: CODA.jumpCut,
    to: KLINGELSTURM_DURATION,
    story: CODA.jumpCut + STORY_SKIP,
    at: ON_HER_LATER,
  },
];

export const storyTime = storyTimeIn(SHOTS);

export const { shotAt, cameraAt } = camerasOf(SHOTS);
