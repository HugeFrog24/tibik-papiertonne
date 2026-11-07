import { indoorSolids } from "../../building/flurShape";
import { Vector3 } from "three";
import { HANDRAIL, HANDRAIL_HEIGHT, STAIRWELL_RAILINGS } from "../../building/stairwell";
import { armColliders } from "../../characters/skeleton";
import {
  sphereObbGap,
  type Contact,
  type Solid,
} from "../../physics/collision";
import { reachArm } from "../../physics/grip";
import { characterViolations, guardLean } from "../../physics/guards";
import { FPS } from "../../frameRate";
import { memoWithArms } from "../../physics/memoSolve";
import { AUTHORED_ARM, FINAL_ARM, lastArm, type ArmHistory } from "../../physics/armHistory";
import { worldSolids } from "../../street/layout";
import { RIG } from "../../Tibik/rig";
import { workArm, type Hold } from "../../physics/holds";
import { restingLids } from "../../street/restingLids";
import { asCharacter, type TibikFrame } from "../../Tibik/character";
import {
  HOLDS,
  ARM_TO_RAIL,
  RAIL_SPAN,
  STORY_END,
  haustuerAt,
  haustuerLeverAt,
  lightsAt,
  tibikAt,
  tibikDoorAt,
  tibikLeverAt,
} from "./choreography";

export type TreppenhausState = {
  readonly tibik: TibikFrame;
  readonly tibikDoor: number;
  readonly haustuer: number;
  readonly tibikLever: number;
  readonly haustuerLever: number;
  readonly lights: number;
};

const EG_RAIL = STAIRWELL_RAILINGS.filter((r) => r.name === "handrail")[0];
const EG_RAIL_LINE = HANDRAIL[0];

const solidsFor = (
  tibikDoor: number,
  haustuer: number,
  tibikLever: number,
  haustuerLever: number,
): Solid[] => [
  ...worldSolids(restingLids(), haustuer, haustuerLever),
  ...indoorSolids({ tibik: tibikDoor, tibikLever }),
];

const GRIP_DOWN_THE_RAIL = 0.04;
const GRIP_BELOW_SHOULDER = RIG.hipHeight + RIG.shoulder.y - HANDRAIL_HEIGHT + GRIP_DOWN_THE_RAIL;
const OFF_WALL = new Vector3(0.008, 0, 0);
const RAIL_END = 0.03;

const onRail = (t: number) => t >= RAIL_SPAN[0] && t <= RAIL_SPAN[1];

const railTarget = (tibik: TibikFrame) => {
  const shoulder = armColliders(RIG, asCharacter(tibik), "rightArm")[0].center;
  const from = new Vector3(...EG_RAIL_LINE.from);
  const to = new Vector3(...EG_RAIL_LINE.to);
  const along = to.clone().sub(from);
  const level =
    Math.abs(along.y) > 1e-6
      ? (shoulder.y - GRIP_BELOW_SHOULDER - from.y) / along.y
      : shoulder.clone().sub(from).dot(along) / along.lengthSq();
  const u = Math.min(1 - RAIL_END, Math.max(RAIL_END, level));
  const handRadius = Math.max(...RIG.hand.size);
  const direction = along.clone().normalize();
  const up = new Vector3(0, 1, 0);
  const normal = up
    .clone()
    .addScaledVector(direction, -up.dot(direction))
    .normalize();
  return from
    .addScaledVector(along, u)
    .addScaledVector(normal, 0.025 + handRadius)
    .add(OFF_WALL);
};

const solve = (t: number, history: ArmHistory): TreppenhausState => {
  const tibikDoor = tibikDoorAt(t);
  const haustuer = haustuerAt(t);
  const tibikLever = tibikLeverAt(t);
  const haustuerLever = haustuerLeverAt(t);
  const solids = solidsFor(tibikDoor, haustuer, tibikLever, haustuerLever);
  let tibik = asCharacter(tibikAt(t));
  tibik = guardLean(tibik, solids);
  tibik = workArm(tibik, "leftArm", t, solids, HOLDS, { history, at: t });
  tibik = onRail(t)
    ? reachArm(
        { ...tibik, pose: { ...tibik.pose, rightArm: ARM_TO_RAIL } },
        "rightArm",
        { touch: EG_RAIL, near: railTarget(tibik) },
        solids,
        null,
        { authoredOnly: true, lastFrame: lastArm({ history, at: t }, "rightArm") },
      )
    : workArm(tibik, "rightArm", t, solids, HOLDS, { history, at: t });
  if (onRail(t)) history.remember(t, "rightArm", AUTHORED_ARM, ARM_TO_RAIL);
  history.remember(t, "rightArm", FINAL_ARM, tibik.pose.rightArm);
  const { position, rotationY, pose, holdingBox } = tibik;
  return {
    tibik: { position, rotationY, pose, holdingBox },
    tibikDoor,
    haustuer,
    tibikLever,
    haustuerLever,
    lights: lightsAt(t),
  };
};

export const solveTreppenhaus = memoWithArms(FPS, solve);

export const treppenhausEnd = () => solveTreppenhaus(STORY_END);

export const treppenhausSolids = (state: TreppenhausState): Solid[] =>
  solidsFor(
    state.tibikDoor,
    state.haustuer,
    state.tibikLever,
    state.haustuerLever,
  );

export const treppenhausViolations = (state: TreppenhausState): Contact[] =>
  characterViolations(asCharacter(state.tibik), treppenhausSolids(state));

export const holdGap = (state: TreppenhausState, hold: Hold, t: number) => {
  const spheres = armColliders(RIG, asCharacter(state.tibik), hold.arm);
  return sphereObbGap(spheres[spheres.length - 1], hold.target(t));
};

export const railGap = (state: TreppenhausState) => {
  const spheres = armColliders(RIG, asCharacter(state.tibik), "rightArm");
  return sphereObbGap(spheres[spheres.length - 1], EG_RAIL);
};
