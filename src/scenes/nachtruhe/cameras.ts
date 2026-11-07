import { BEDROOM, BEDROOM_DOORWAY } from "../../building/bedroomShape";
import { allColliders } from "../../characters/skeleton";
import { asCharacter } from "../../Tibik/character";
import { RIG } from "../../Tibik/rig";
import { SWITCH_PRESS, bedroomAt, curtainGrip } from "./bedroom";
import { ENTRANCE_X, FACADE_Z, flatWindow } from "../../street/building";
import type { Vec3 } from "../../toon/primitives";
import { camerasOf, dolly, fixed, type CameraSetup, type Shot } from "../../toon/shots";
import { CURTAIN_PULL, DAWN, DRONE, DUSK, ENTRY, EVENING, EYES_OPEN, GET_DOWN, KAREN_OUT, LAMP_OFF, LAMP_ON_AT_DUSK, LIE_DOWN, MORNING, SIT_UP, WALK_ROUND } from "./timeline";

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
  switch: SWITCH_PRESS.toArray() as Vec3,
  sittingUp: headAt(SIT_UP[1]),
  curtain: curtainGrip((CURTAIN_PULL[0] + CURTAIN_PULL[1]) / 2).center.toArray() as Vec3,
};

const centreOf = (points: readonly Vec3[]): Vec3 => [0, 1, 2].map((i) => points.reduce((sum, p) => sum + p[i], 0) / points.length) as unknown as Vec3;

const HIGH_BY_THE_DOOR: Vec3 = [BEDROOM_DOORWAY.x0 - 1.3, BEDROOM.floor + 2.1, BEDROOM.z0 + 0.25];
const BEDROOM_LENS = 60;
const AT_THE_BED: CameraSetup = { position: HIGH_BY_THE_DOOR, target: centreOf([AT.lying, AT.sittingUp]), fov: BEDROOM_LENS };
const AT_THE_WINDOW: CameraSetup = { position: HIGH_BY_THE_DOOR, target: AT.curtain, fov: BEDROOM_LENS };

const DRONE_FROM: CameraSetup = { position: [between, his.y, 6.0], target: [between, his.y, FACADE_Z], fov: 50 };
const DRONE_TO: CameraSetup = { position: [between, 24, 14], target: [between, 6, -16], fov: 55 };

const SHOTS_AT = { dusk: DUSK, evening: EVENING, drone: DRONE, dawn: DAWN, morning: MORNING } as const;

export const NACHTRUHE_SHOTS: readonly Shot[] = [
  { name: "Dusk wide", from: SHOTS_AT.dusk[0], to: SHOTS_AT.dusk[1], at: fixed(DUSK_VIEW.position, DUSK_VIEW.target, DUSK_VIEW.fov) },
  { name: "Bedroom: evening", from: SHOTS_AT.evening[0], to: SHOTS_AT.evening[1], at: fixed(AT_THE_BED.position, AT_THE_BED.target, AT_THE_BED.fov) },
  { name: "Drone rise", from: SHOTS_AT.drone[0], to: SHOTS_AT.drone[1], at: dolly(DRONE_FROM, DRONE_TO, SHOTS_AT.drone[0], SHOTS_AT.drone[1]) },
  { name: "Dawn", from: SHOTS_AT.dawn[0], to: SHOTS_AT.dawn[1], at: fixed(DRONE_TO.position, DRONE_TO.target, DRONE_TO.fov) },
  { name: "Bedroom: morning", from: SHOTS_AT.morning[0], to: SHOTS_AT.morning[1], at: dolly(AT_THE_BED, AT_THE_WINDOW, WALK_ROUND[0], WALK_ROUND[1]) },
];

export const { shotAt, cameraAt } = camerasOf(NACHTRUHE_SHOTS);

export const inTheBedroom = (t: number) => shotAt(t).name.startsWith("Bedroom");

export const lightingAt = (t: number) => ({ street: !inTheBedroom(t), bedroom: inTheBedroom(t) });

const CAPTION_HOLD = 3;
export const CAPTION = { text: "Zwei Wochen später.", from: MORNING[0], to: MORNING[0] + CAPTION_HOLD } as const;


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
