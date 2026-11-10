import { TIBIK_DOOR, doorbellButtonCenter } from "../../building/stairwell";
import { DOWN_THE_STAIRS, EXIT } from "./exit";
import { doorFrame, viewerAxis, viewerLens, type Door } from "../../building/doors";
import { floorLevel } from "../../street/building";
import type { Vec3 } from "../../toon/primitives";
import { onFrames, between, weighedAmidst, camerasOf, following, heldBetween, reframe, smoothed, storyTimeIn, withTall, type CameraSetup, type Shot } from "../../toon/shots";
import { KAREN_SKELETON } from "../../Karen/rig";
import { acrossTheShorterSide, FISHEYE } from "../../toon/fisheye";
import { aspectOf } from "../../frameRate";
import { jolted } from "../../toon/cameraJolt";
import { karenMouthEmitter } from "../../Karen/mouthEmitter";
import { ASH, CODA, ON_THE_FILTER, cigaretteFrame } from "./cigarette";
import { cigaretteTip } from "../../props/cigaretteShape";
import { STORY_SKIP } from "./light";
import { Vector3 } from "three";
import { lazy } from "../../physics/lazy";
import { after, inWindow, lerp, round6 } from "../../characters/scalar";
import { mouthInWorld } from "../../dialogue/screen";
import { RIG } from "../../Tibik/rig";
import { BANGING } from "./banging";
import { CLICK, CONNECTED, KEYS, POCKET, phoneAt } from "./calls";
import { AJAR_ANGLE, tibikAt, OPEN } from "./door";
import { TAPING, parcelBody } from "./parcel";
import { KLINGELSTURM_DURATION, karenAt, phoneFrame } from "./choreography";
import { SCREEN_CENTRE } from "../../Karen/phoneShape";


const FLOOR = floorLevel(1);
const lensOf = (door: Door): Vec3 => viewerLens(door).toArray();

const WIDE: CameraSetup = {
  position: [-1.2, FLOOR + 1.6, -7.8],
  target: [-3.0, FLOOR + 1.0, -9.15],
  fov: 50,
};

const CODA_WIDE: CameraSetup = {
  ...WIDE,
  position: [-1.2, FLOOR + 1.75, -7.8],
  target: [-2.09, FLOOR + 1.25, -9.13],
};

export const SPYHOLE: CameraSetup = {
  position: lensOf(TIBIK_DOOR),
  target: viewerLens(TIBIK_DOOR).add(viewerAxis(TIBIK_DOOR)).toArray(),
  fov: (2 * FISHEYE.halfAngle * 180) / Math.PI,
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
  const between = karenMouthEmitter(karen).origin.lerp(cigaretteTip(cigaretteFrame(karen, CODA.flick), 0), 0.5);
  return { position: PHONE_EYE, target: [between.x, between.y, between.z], fov: SMOKING_FOV };
});

const ASH_INSERT = { position: [-1.4, FLOOR + 1.25, -8.45] as Vec3, fov: 32, onTheFloor: 21, follow: 0.55, down: 0.8 };

const ASH_AIM = lazy(() => {
  const tapping = CODA.taps[0][0];
  const held = cigaretteFrame(karenAt(tapping), tapping);
  const fist = new Vector3(0, 0, ON_THE_FILTER.along).applyMatrix4(held).lerp(cigaretteTip(held, 0), 0.5);
  const breaking = cigaretteFrame(karenAt(CODA.ashOff), CODA.ashOff);
  const below = cigaretteTip(breaking, 0).setY(FLOOR + ASH.hold / 2);
  return { fist, below };
});

const ON_THE_ASH = (t: number): CameraSetup => {
  const { fist, below } = ASH_AIM();
  const followed = inWindow(t, [CODA.ashOff, CODA.ashOff + ASH_INSERT.follow]);
  const aim = fist.clone().lerp(below, ASH_INSERT.down * followed);
  return { position: ASH_INSERT.position, target: [aim.x, aim.y, aim.z], fov: lerp(ASH_INSERT.fov, ASH_INSERT.onTheFloor, followed) };
};

const DIALLING: readonly [number, number] = [
  KEYS[1].at - 0.15,
  KEYS[KEYS.length - 1].at + 0.3,
];
const PHONE_INSERT = { after: 0.4, length: 1.4, over: new Vector3(-0.2, 0.82, -0.54), distance: 0.42, fov: 24 };
const ON_HER_PHONE: readonly [number, number] = [
  round6(CONNECTED + PHONE_INSERT.after),
  round6(CONNECTED + PHONE_INSERT.after + PHONE_INSERT.length),
];
const UP = new Vector3(0, 1, 0);

const OVER_HER_SHOULDER = lazy((): CameraSetup => {
  const t = ON_HER_PHONE[0];
  const karen = karenAt(t);
  const screen = new Vector3(...SCREEN_CENTRE).applyMatrix4(phoneFrame(karen, phoneAt(t)));
  const eye = PHONE_INSERT.over
    .clone()
    .normalize()
    .applyAxisAngle(UP, karen.rotationY)
    .multiplyScalar(PHONE_INSERT.distance)
    .add(screen);
  return {
    position: [eye.x, eye.y, eye.z],
    target: [screen.x, screen.y, screen.z],
    fov: PHONE_INSERT.fov,
  };
});

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

const BLOW_JOLT = { landing: 1, flur: 0.6 };

const pointOf = (at: Vector3): Vec3 => [at.x, at.y, at.z];
const KAREN_HEAD = (t: number) => pointOf(mouthInWorld(KAREN_SKELETON, karenAt(t)));
const TIBIK_HEAD = (t: number) => pointOf(mouthInWorld(RIG, tibikAt(t)));
const TALL = {
  onTibik: [0, 0.1, 0] as Vec3,
  gapFov: 56,
  codaFov: 75,
  codaLean: 0.5,
  codaEase: 1,
  faceAboveTheBar: -0.1,
  phoneWindow: 2.4,
  screenAboveTheBar: -0.015,
  phoneFov: 56,
  bangingFov: 54,
};

const phoneTall = (from: number, to: number) => following(PHONE_SHOT, KAREN_HEAD, { shift: [0, TALL.faceAboveTheBar, 0], during: [from, to], window: TALL.phoneWindow, fov: TALL.phoneFov });
const flurTall = (from: number, to: number) => withTall(() => FLUR_SHOT, { aimAt: smoothed(heldBetween(TIBIK_HEAD, from, to)), shift: TALL.onTibik });

const blowJolts = (strength: number) => BANGING.blows.map((at) => ({ at, strength }));

const TIBIK_STEPS_OUT = 55.4;

const tibikInTheCoda = (t: number) => {
  const out = inWindow(t, after(EXIT.offset, TALL.codaEase)) * (1 - inWindow(t, after(DOWN_THE_STAIRS, TALL.codaEase)));
  return TALL.codaLean + (1 - TALL.codaLean) * out;
};

export const SHOTS: readonly Shot[] = onFrames([
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
    ...flurTall(FLUR_CUT[0], FLUR_CUT[1]),
  },
  { name: "Wide: still ringing", from: FLUR_CUT[1], to: 6.0, at: () => WIDE },
  { name: "Spyhole", from: 6.0, to: OPEN[0], ...withTall(() => SPYHOLE, { fov: acrossTheShorterSide(SPYHOLE.fov, aspectOf("tall")) }) },
  { name: "Over Karen: the gap", from: OPEN[0], to: POCKET[1], ...withTall(GAP_SHOT, { aimAt: between(TIBIK_HEAD, KAREN_HEAD), fov: TALL.gapFov }) },
  {
    name: "Medium: the phone",
    from: POCKET[1],
    to: TAPING_CUT[0],
    ...phoneTall(POCKET[1], TAPING_CUT[0]),
  },
  {
    name: "Flur: taping",
    from: TAPING_CUT[0],
    to: TAPING_CUT[1],
    ...flurTall(TAPING_CUT[0], TAPING_CUT[1]),
  },
  {
    name: "Medium: the answering machine",
    from: TAPING_CUT[1],
    to: BANGING.wideCut,
    ...phoneTall(TAPING_CUT[1], BANGING.wideCut),
  },
  {
    name: "Wide: the banging",
    from: BANGING.wideCut,
    to: BANGING.flurCut[0],
    at: jolted(() => WIDE, blowJolts(BLOW_JOLT.landing)),
    tall: jolted(reframe(() => WIDE, { aimAt: smoothed(heldBetween(KAREN_HEAD, BANGING.wideCut, BANGING.flurCut[0]), TALL.phoneWindow), fov: TALL.bangingFov }), blowJolts(BLOW_JOLT.landing)),
    blur: true,
  },
  {
    name: "Flur: the banging",
    from: BANGING.flurCut[0],
    to: BANGING.flurCut[1],
    at: jolted(FLUR_ON_THE_PARCEL, blowJolts(BLOW_JOLT.flur)),
    blur: true,
  },
  {
    name: "Medium: back to the phone",
    from: BANGING.flurCut[1],
    to: DIALLING[1],
    ...phoneTall(BANGING.flurCut[1], DIALLING[1]),
  },
  {
    name: "Medium: ringing the police",
    from: DIALLING[1],
    to: ON_HER_PHONE[0],
    ...phoneTall(DIALLING[1], ON_HER_PHONE[0]),
  },
  {
    name: "Insert: her phone",
    from: ON_HER_PHONE[0],
    to: ON_HER_PHONE[1],
    ...withTall(OVER_HER_SHOULDER, { shift: [0, TALL.screenAboveTheBar, 0] }),
  },
  {
    name: "Medium: the police",
    from: ON_HER_PHONE[1],
    to: CLICK,
    ...phoneTall(ON_HER_PHONE[1], CLICK),
  },
  {
    name: "Wide: the light goes out",
    from: CLICK,
    to: CODA.mediumCut,
    ...withTall(() => CODA_WIDE, { aimAt: weighedAmidst(CODA_WIDE.position, [heldBetween(TIBIK_HEAD, TIBIK_STEPS_OUT, DOWN_THE_STAIRS), tibikInTheCoda], [KAREN_HEAD, () => 1]), fov: TALL.codaFov }),
  },
  {
    name: "Close-up: the cigarette",
    from: CODA.mediumCut,
    to: CODA.jumpCut,
    ...following(AT_HER_MOUTH, KAREN_HEAD, { during: [CODA.mediumCut, CODA.jumpCut] }),
  },
  {
    name: "Wide: later",
    from: CODA.jumpCut,
    to: CODA.aside[0],
    story: CODA.jumpCut + STORY_SKIP,
    at: ON_HER_LATER,
  },
  {
    name: "Insert: the ash",
    from: CODA.aside[0],
    to: KLINGELSTURM_DURATION,
    story: CODA.aside[0] + STORY_SKIP,
    at: ON_THE_ASH,
  },
]);

export const storyTime = storyTimeIn(SHOTS);

export const { shotAt, cameraAt } = camerasOf(SHOTS);
