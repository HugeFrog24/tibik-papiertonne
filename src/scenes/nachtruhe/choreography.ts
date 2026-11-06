import { BEDROOM_DOOR, type CurtainOpen } from "../../building/bedroomShape";
import { blinkAt, kf } from "../../characters/animate";
import { STEP_OVERLAP, offTheEdges, opposite, rhythmicSteps, strideAt, touchdownTimes, walkCadence } from "../../characters/gait";
import { inWindow } from "../../characters/scalar";
import type { Walk } from "../../characters/walkPath";
import { ENTRANCE_X, flatWindow, type Opening } from "../../street/building";
import { entranceGround } from "../../street/layout";
import { SENSOR, sensorLampOn } from "../../street/entranceSensor";
import { switchedOn } from "../../street/lightsOn";
import { TIBIK_GAIT, plantedTibik, tibikGaitOf, type TibikFrame } from "../../Tibik/character";
import { RIG, TIBIK_REST } from "../../Tibik/rig";
import { walkingPose } from "../../Tibik/walkingArms";
import type { Vec3 } from "../../toon/primitives";
import { mixLooks, WEATHER, type WeatherLook } from "../../weather/overcast";
import { DOOR_STAND, pinApproach, walkLeg, type Root } from "../enterHouse";
import { bedroomAt, coveredAt, curtainOpenAt } from "./bedroom";
import {
  DAWN,
  DRONE,
  DUSK,
  ENTRY,
  KAREN_OUT,
  LAMP_OFF,
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
  hisLamp: [[LAMP_ON_AT_DUSK, LAMP_OFF]],
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
  const pose = { ...TIBIK_REST, bob: TIBIK_REST.bob - ENTRY.crouchAt(t), blink: blinkAt(t, DUSK_BLINKS), ...walkingPose(t, DUSK_LEGS, strideAt(duskGait(), t), ENTRY.tuckedAt(t)) };
  return plantedTibik(duskGait(), t, { position: [x, y, z], rotationY: yaw, pose });
};

export { BED_SEAT } from "./bedroom";

export const nachtruheTibikAt = (t: number): TibikFrame => (t < DUSK[1] ? duskTibikAt(t) : bedroomAt(t));

const his = flatWindow(12, 1, "links");
const hers = flatWindow(12, 1, "rechts");
const same = (a: Opening, b: Opening) => a.kind === b.kind && a.x === b.x && a.storey === b.storey;
const inHisFlat = (house: number, o: Opening) => house === 12 && o.storey === his.storey && o.x < ENTRANCE_X && o.kind !== "stairs";

export const rainShareAt = (t: number) => inWindow(t, DAWN);

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
  const curtains: CurtainOpen = [0, curtainOpenAt(t)];
  return {
    look: lookAt(t),
    rain: rainShareAt(t),
    livingRoomLit: false,
    lampsOn: during(t, LIGHTS.streetLamps),
    entranceLamp: t < DUSK[1] && sensorLampOn(duskRoot, SENSOR.range, t),
    town: kf(t, TOWN.times, TOWN.shares),
    lamps,
    stairwellLit,
    windowLight,
    curtains,
    blanket: coveredAt(t),
    bedroomDoor: BEDROOM_DOOR.open,
  };
};

export type NachtruheWorld = ReturnType<typeof nachtruheWorldAt>;

export const duskStepTimes = (fps: number) => touchdownTimes(duskGait(), DUSK[1], fps);
