import { BEDROOM, BEDROOM_DOORWAY } from "../../building/bedroomShape";
import { allColliders } from "../../characters/skeleton";
import { asCharacter } from "../../Tibik/character";
import { RIG } from "../../Tibik/rig";
import { SWITCH_PRESS, bedroomAt, curtainGrip } from "./bedroom";
import { ENTRANCE_X, FACADE_Z, flatWindow } from "../../street/building";
import type { Vec3 } from "../../toon/primitives";
import { onFrames, camerasOf, dolly, fixed, following, withTall, type CameraSetup, type Shot } from "../../toon/shots";
import { easeUnit } from "../../characters/scalar";
import { CURTAIN_PULL, DRONE, DUSK, ENTRY, EVENING, EYES_OPEN, GET_DOWN, KAREN_OUT, LAMP_OFF, LAMP_ON_AT_DUSK, LIE_DOWN, MORNING, SIT_UP, WALK_ROUND } from "./timeline";

export { NACHTRUHE_DURATION } from "./timeline";

const his = flatWindow(12, 1, "links");
const hers = flatWindow(12, 1, "rechts");
const between = (his.x + hers.x) / 2;

const DUSK_VIEW: CameraSetup = { position: [21, 2.2, 11.75], target: [-6.5, 4.4, FACADE_Z], fov: 50 };

const headAt = (t: number): Vec3 => {
  const [x, y, z] = allColliders(RIG, asCharacter(bedroomAt(t))).find((c) => c.name.includes("head"))!.center.toArray();
  return [x, y, z];
};

const AT = {
  lying: headAt(LIE_DOWN[1] + 0.7),
  waking: headAt(EYES_OPEN[1]),
  switch: SWITCH_PRESS.toArray(),
  sittingUp: headAt(SIT_UP[1]),
  curtain: curtainGrip((CURTAIN_PULL[0] + CURTAIN_PULL[1]) / 2).center.toArray(),
};

const centreOf = (points: readonly Vec3[]): Vec3 => [0, 1, 2].map((i) => points.reduce((sum, p) => sum + p[i], 0) / points.length) as unknown as Vec3;

const HIGH_BY_THE_DOOR: Vec3 = [BEDROOM_DOORWAY.x0 - 1.3, BEDROOM.floor + 2.1, BEDROOM.z0 + 0.25];
const BEDROOM_LENS = 60;
const AT_THE_BED: CameraSetup = { position: HIGH_BY_THE_DOOR, target: centreOf([AT.lying, AT.sittingUp]), fov: BEDROOM_LENS };
const AT_THE_WINDOW: CameraSetup = { position: HIGH_BY_THE_DOOR, target: AT.curtain, fov: BEDROOM_LENS };

const DRONE_FROM: CameraSetup = { position: [between, his.y, 6.0], target: [between, his.y, FACADE_Z], fov: 50 };
const DRONE_TO: CameraSetup = { position: [between, 24, 14], target: [between, 6, -16], fov: 55 };

const SHOTS_AT = { dusk: DUSK, evening: EVENING, drone: DRONE, morning: MORNING } as const;

const TOWARD_THE_MOMENT = { ease: 0.4, share: 0.25, fov: 72, window: 2.4 };

const towardTheMoment = (t: number): Vec3 => {
  const { ease, share } = TOWARD_THE_MOMENT;
  const pulls = KEY_MOMENTS.map((m) => ({ at: m.at, k: share * Math.min(easeUnit((t - (m.from - ease)) / ease), easeUnit((m.to + ease - t) / ease)) }));
  const strongest = pulls.reduce((a, b) => (b.k > a.k ? b : a));
  return headAt(t).map((v, i) => v + (strongest.at[i] - v) * strongest.k) as Vec3;
};

const DRONE_RISE = dolly(DRONE_FROM, DRONE_TO, SHOTS_AT.drone[0], SHOTS_AT.drone[1]);
const TO_HER_WINDOW = { from: SHOTS_AT.drone[0] + 1.5, to: KAREN_OUT - 0.4 };

const droneTallAim = (t: number): Vec3 => {
  const [x, y, z] = DRONE_RISE(t).target;
  return [x + (his.x - between) * (1 - easeUnit((t - TO_HER_WINDOW.from) / (TO_HER_WINDOW.to - TO_HER_WINDOW.from))), y, z];
};


export const NACHTRUHE_SHOTS: readonly Shot[] = onFrames([
  { name: "Dusk wide", from: SHOTS_AT.dusk[0], to: SHOTS_AT.dusk[1], at: fixed(DUSK_VIEW.position, DUSK_VIEW.target, DUSK_VIEW.fov) },
  { name: "Bedroom: evening", from: SHOTS_AT.evening[0], to: SHOTS_AT.evening[1], ...following(fixed(AT_THE_BED.position, AT_THE_BED.target, AT_THE_BED.fov), towardTheMoment, { fov: TOWARD_THE_MOMENT.fov, during: SHOTS_AT.evening, window: TOWARD_THE_MOMENT.window }) },
  { name: "Drone rise", from: SHOTS_AT.drone[0], to: SHOTS_AT.drone[1], ...withTall(DRONE_RISE, { aimAt: droneTallAim }) },
  { name: "Bedroom: morning", from: SHOTS_AT.morning[0], to: SHOTS_AT.morning[1], ...following(dolly(AT_THE_BED, AT_THE_WINDOW, WALK_ROUND[0], WALK_ROUND[1]), towardTheMoment, { fov: TOWARD_THE_MOMENT.fov, during: SHOTS_AT.morning, window: TOWARD_THE_MOMENT.window }) },
]);

export const { shotAt, cameraAt } = camerasOf(NACHTRUHE_SHOTS);

export const inTheBedroom = (t: number) => shotAt(t).name.startsWith("Bedroom");

export const lightingAt = (t: number) => ({ street: !inTheBedroom(t), bedroom: inTheBedroom(t) });



export type KeyMoment = { readonly name: string; readonly from: number; readonly to: number; readonly at: Vec3 };

export const KEY_MOMENTS: readonly KeyMoment[] = [
  { name: "he comes in through the Haustür", from: ENTRY.unlock[0], to: ENTRY.indoors[1], at: [ENTRANCE_X, 1.3, FACADE_Z] },
  { name: "his window lights up", from: LAMP_ON_AT_DUSK - 0.2, to: LAMP_ON_AT_DUSK + 0.4, at: [his.x, his.y, FACADE_Z] },
  { name: "he lies down", from: LIE_DOWN[0], to: LIE_DOWN[1] + 0.7, at: AT.lying },
  { name: "he switches his lamp off", from: LAMP_OFF - 0.45, to: LAMP_OFF + 0.12, at: AT.switch },
  { name: "he opens his eyes", from: EYES_OPEN[0], to: EYES_OPEN[1], at: AT.waking },
  { name: "Karen's window goes out last", from: KAREN_OUT, to: KAREN_OUT + 1, at: [hers.x, hers.y, FACADE_Z] },
  { name: "he gets up", from: SIT_UP[0], to: GET_DOWN[1], at: AT.sittingUp },
  { name: "he opens the curtain", from: CURTAIN_PULL[0], to: CURTAIN_PULL[1], at: AT.curtain },
];
