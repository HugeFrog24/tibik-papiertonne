import { BEDROOM_DOOR, type CurtainOpen } from "../../building/bedroomShape";
import { armKf, blinkAt, kf } from "../../characters/animate";
import { STEP_OVERLAP, offTheEdges, opposite, rhythmicSteps, strideAt, walkCadence } from "../../characters/gait";
import { inWindow } from "../../characters/scalar";
import type { Walk } from "../../characters/walkPath";
import { ENTRANCE_X, flatWindow, type Opening } from "../../street/building";
import { entranceGround } from "../../street/layout";
import { SENSOR, sensorLampOn } from "../../street/entranceSensor";
import { switchedOn } from "../../street/lightsOn";
import { TIBIK_GAIT, plantedTibik, tibikGaitOf, type TibikFrame } from "../../Tibik/character";
import { RIG, TIBIK_REST } from "../../Tibik/rig";
import { WALK_SWAY, WALK_SWING, swungArms, walkArmKeys, walkingOn } from "../../Tibik/walkingArms";
import type { Vec3 } from "../../toon/primitives";
import { mixLooks, WEATHER, type WeatherLook } from "../../weather/overcast";
import { DOOR_STAND, pinApproach, walkLeg, type Root } from "../enterHouse";
import { bedroomEveningAt } from "./bedroom";
import {
  BLANKET_BACK,
  BLANKET_UP,
  CURTAIN_PULL,
  DAWN,
  DRONE,
  DUSK,
  ENTRY,
  KAREN_OUT,
  LAMP_OFF,
  LAMP_ON,
  LAMP_ON_AT_DUSK,
  STAIRWELL_ON,
  STREET_LAMPS_ON,
  WALK_HOME,
} from "./timeline";

export const FAR = 0;
export const HIS = 1;

export const LIGHTS = {
  streetLamps: [STREET_LAMPS_ON, DAWN[0] + 1.6],
  stairwell: [STAIRWELL_ON, DUSK[1]],
  hisLamp: [
    [LAMP_ON_AT_DUSK, LAMP_OFF],
    [LAMP_ON, Infinity],
  ],
  karen: [-Infinity, KAREN_OUT],
} as const;

const NEIGHBOURS = { times: [0, DUSK[1], DRONE[0], KAREN_OUT - 1], shares: [0.8, 1, 0.7, 0] } as const;
const TOWN = { times: [0, DUSK[1], DRONE[1], DAWN[1]], shares: [0.8, 1, 0.3, 0] } as const;
const GLOW = 1;

const during = (t: number, [from, to]: readonly [number, number]) => t >= from && t < to;

const walkHome: Walk = {
  from: WALK_HOME[0],
  to: WALK_HOME[1],
  via: [
    [-7.4, 0.65],
    [-4.6, 0.65],
    [DOOR_STAND.x, -0.4],
    [DOOR_STAND.x, DOOR_STAND.z],
  ],
};

export const duskRootAt = (t: number): Root => ENTRY.rootAt(t) ?? walkLeg(walkHome, t);

const duskRoot = (t: number): Vec3 => {
  const { x, y, z } = duskRootAt(t);
  return [x, y, z];
};

const DUSK_LEGS = [WALK_HOME, ENTRY.walkingIn] as const;
const DUSK_BLINKS = [1.3, 3.6, 6.2, 9.1];

const duskSteps = () => {
  const cadence = walkCadence(duskRootAt);
  const home = pinApproach(rhythmicSteps({ from: WALK_HOME[0], to: WALK_HOME[1], first: -1, cadence, overlap: STEP_OVERLAP }));
  return [...home, ...ENTRY.steps(opposite(home[home.length - 1].side), cadence)];
};

const duskGait = tibikGaitOf(
  duskRootAt,
  () => offTheEdges(RIG, TIBIK_GAIT, duskRootAt, duskSteps(), [WALK_HOME[0], DUSK[1]], entranceGround),
  DUSK[1],
  entranceGround,
);

const duskTibikAt = (t: number): TibikFrame => {
  const { x, y, z, yaw } = duskRootAt(t);
  const walking = Math.max(...walkingOn(t, DUSK_LEGS));
  const step = strideAt(duskGait(), t);
  const tucked = ENTRY.tuckedAt(t);
  const keys = walkArmKeys(DUSK_LEGS);
  const arms = armKf(t, keys.times, keys.poses);
  const pose = {
    ...TIBIK_REST,
    sway: step * WALK_SWAY * walking,
    blink: blinkAt(t, DUSK_BLINKS),
    ...swungArms(arms, WALK_SWING * walking * step * (1 - tucked), tucked),
  };
  return plantedTibik(duskGait(), t, { position: [x, y, z], rotationY: yaw, pose });
};

export { BED_SEAT } from "./bedroom";

export const nachtruheTibikAt = (t: number): TibikFrame => (t < DUSK[1] ? duskTibikAt(t) : bedroomEveningAt(t));

const his = flatWindow(12, 1, "links");
const hers = flatWindow(12, 1, "rechts");
const same = (a: Opening, b: Opening) => a.kind === b.kind && a.x === b.x && a.storey === b.storey;
const inHisFlat = (house: number, o: Opening) => house === 12 && o.storey === his.storey && o.x < ENTRANCE_X && o.kind !== "stairs";

const lookAt = (t: number): WeatherLook => (t < DUSK[1] ? WEATHER.dusk : mixLooks(WEATHER.night, WEATHER.rain, inWindow(t, DAWN)));

export const nachtruheWorldAt = (t: number) => {
  const lamps: readonly [boolean, boolean] = [false, LIGHTS.hisLamp.some((span) => during(t, span))];
  const stairwellLit = during(t, LIGHTS.stairwell);
  const karenLit = during(t, LIGHTS.karen);
  const neighbours = kf(t, NEIGHBOURS.times, NEIGHBOURS.shares);
  const windowLight = (house: number, o: Opening) => {
    if (house === 12 && same(o, his)) return lamps[HIS] ? GLOW : 0;
    if (house === 12 && same(o, hers)) return karenLit ? GLOW : 0;
    if (inHisFlat(house, o)) return 0;
    if (o.kind === "stairs") return house === 12 && stairwellLit ? GLOW : 0;
    return switchedOn(`nachtruhe/${house}/${o.kind}/${o.x}/${o.storey}`, neighbours) ? GLOW : 0;
  };
  const curtains: CurtainOpen = [0, inWindow(t, CURTAIN_PULL)];
  return {
    look: lookAt(t),
    rain: t >= DAWN[0],
    lampsOn: during(t, LIGHTS.streetLamps),
    entranceLamp: t < DUSK[1] && sensorLampOn(duskRoot, SENSOR.range, t),
    town: kf(t, TOWN.times, TOWN.shares),
    lamps,
    stairwellLit,
    windowLight,
    curtains,
    blanket: kf(t, [BLANKET_UP[0], BLANKET_UP[1], BLANKET_BACK[0], BLANKET_BACK[1]], [0, 1, 1, 0]),
    bedroomDoor: BEDROOM_DOOR.open,
  };
};

export type NachtruheWorld = ReturnType<typeof nachtruheWorldAt>;
