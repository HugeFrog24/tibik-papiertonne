import { BED_RECT, BEDROOM, BEDROOM_DOORWAY } from "../../building/bedroomShape";
import { ENTRANCE_X, FACADE_Z, flatWindow } from "../../street/building";
import type { Vec3 } from "../../toon/primitives";
import { camerasOf, dolly, fixed, type CameraSetup, type Shot } from "../hausmuell/cameras";
import { CURTAIN_PULL, DAWN, DRONE, DUSK, ENTRY, EVENING, HOP_DOWN, KAREN_OUT, LAMP_ON_AT_DUSK, LIE_DOWN, MORNING, SIT_UP } from "./timeline";

export { NACHTRUHE_DURATION } from "./timeline";

const his = flatWindow(12, 1, "links");
const hers = flatWindow(12, 1, "rechts");
const between = (his.x + hers.x) / 2;

const DUSK_VIEW: CameraSetup = { position: [21, 2.2, 11.75], target: [-6.5, 4.4, FACADE_Z], fov: 50 };

const DOORWAY: CameraSetup = {
  position: [(BEDROOM_DOORWAY.x0 + BEDROOM_DOORWAY.x1) / 2, BEDROOM.floor + 1.5, BEDROOM.z0 - 0.42],
  target: [-9.25, BEDROOM.floor + 0.85, -3.2],
  fov: 55,
};

const DRONE_FROM: CameraSetup = { position: [between, his.y, 6.0], target: [between, his.y, FACADE_Z], fov: 50 };
const DRONE_TO: CameraSetup = { position: [between, 24, 14], target: [between, 6, -16], fov: 55 };

const SHOTS_AT = { dusk: DUSK, evening: EVENING, drone: DRONE, dawn: DAWN, morning: MORNING } as const;

export const NACHTRUHE_SHOTS: readonly Shot[] = [
  { name: "Dusk wide", from: SHOTS_AT.dusk[0], to: SHOTS_AT.dusk[1], at: fixed(DUSK_VIEW.position, DUSK_VIEW.target, DUSK_VIEW.fov) },
  { name: "Bedroom: evening", from: SHOTS_AT.evening[0], to: SHOTS_AT.evening[1], at: fixed(DOORWAY.position, DOORWAY.target, DOORWAY.fov) },
  { name: "Drone rise", from: SHOTS_AT.drone[0], to: SHOTS_AT.drone[1], at: dolly(DRONE_FROM, DRONE_TO, SHOTS_AT.drone[0], SHOTS_AT.drone[1]) },
  { name: "Dawn", from: SHOTS_AT.dawn[0], to: SHOTS_AT.dawn[1], at: fixed(DRONE_TO.position, DRONE_TO.target, DRONE_TO.fov) },
  { name: "Bedroom: morning", from: SHOTS_AT.morning[0], to: SHOTS_AT.morning[1], at: fixed(DOORWAY.position, DOORWAY.target, DOORWAY.fov) },
];

export const { shotAt, cameraAt } = camerasOf(NACHTRUHE_SHOTS);

export const inTheBedroom = (t: number) => shotAt(t).name.startsWith("Bedroom");

export const lightingAt = (t: number) => ({ street: !inTheBedroom(t), bedroom: inTheBedroom(t) });

const CAPTION_HOLD = 3;
export const CAPTION = { text: "Zwei Wochen später.", from: MORNING[0], to: MORNING[0] + CAPTION_HOLD } as const;

const bed: Vec3 = [BED_RECT.x0 + 1.0, BED_RECT.top + 0.3, (BED_RECT.z0 + BED_RECT.z1) / 2];

export type KeyMoment = { readonly name: string; readonly from: number; readonly to: number; readonly at: Vec3 };

export const KEY_MOMENTS: readonly KeyMoment[] = [
  { name: "he comes in through the Haustür", from: ENTRY.unlock[0], to: ENTRY.indoors[1], at: [ENTRANCE_X, 1.3, FACADE_Z] },
  { name: "his window lights up", from: LAMP_ON_AT_DUSK - 0.2, to: LAMP_ON_AT_DUSK + 0.4, at: [his.x, his.y, FACADE_Z] },
  { name: "he lies down", from: LIE_DOWN[0], to: LIE_DOWN[1] + 0.7, at: bed },
  { name: "Karen's window goes out last", from: KAREN_OUT, to: KAREN_OUT + 1, at: [hers.x, hers.y, FACADE_Z] },
  { name: "he gets up", from: SIT_UP[0], to: HOP_DOWN[1], at: bed },
  { name: "he opens the curtain", from: CURTAIN_PULL[0], to: CURTAIN_PULL[1], at: [his.x, his.y, BEDROOM.z1] },
];
