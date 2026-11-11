import { indoorSolids } from "../../building/flurShape";
import {
  contacts,
  frame,
  sphere,
  sphereObbGap,
  type Contact,
  type Obb,
  type Solid,
} from "../../physics/collision";
import { armLimb, gripGapViolations, holdCarried } from "../../physics/grip";
import {
  characterViolations,
  guardBody,
  guardGround,
  guardLean,
  guardLeanNoDeeper,
  settleArm,
  withArm,
} from "../../physics/guards";
import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import {
  armColliders,
  bodyColliders,
  boxIntoTorso,
  carriedBox,
  torsoMatrix,
} from "../../characters/skeleton";
import {
  FOUND_KARTON_SIZE,
  kartonBounds,
  kartonFlapSolids,
} from "../../street/kartonShape";
import {
  BINS,
  FOUND_SHEET,
  GROUND,
  SEARCHED_BIN,
  binByName,
  STREET_SOLIDS,
  binContentSolids,
  binItemColliders,
  worldSolids,
} from "../../street/layout";
import { restingLid } from "../../street/lids";
import { TONNE, tonneColliders, tonneLidParts } from "../../street/tonneShape";
import { headSurface } from "../../Tibik/headShape";
import { memoWithArms, openingOn } from "../../physics/memoSolve";
import { treppenhausEnd } from "../treppenhaus/solve";
import { FINAL_ARM, lastArm, type ArmClock, type ArmHistory } from "../../physics/armHistory";
import { blendArm } from "../../physics/armDescent";
import { kf } from "../../characters/animate";
import { smoothstep } from "../../characters/scalar";
import { TIMELINE_FPS } from "../../frameRate";
import { guardLid } from "../../street/restingLids";
import { asCharacter } from "../../Tibik/character";
import { RIG } from "../../Tibik/rig";
import { OUTLINE } from "../../toon/primitives";
import { workArm, type Hold } from "../../physics/holds";
import {
  PAPIERTONNEN_HOLDS,
  PAPIERTONNEN_LAST_T,
  kartonAt,
  lidAt,
  nearTheDoor,
  papiertonnenHaustuerAt,
  tibikAt,
  type KartonState,
  type TibikFrame,
  SHOT_FOUND_BOX,
} from "./choreography";

export type PapiertonnenState = {
  readonly lids: readonly number[];
  readonly haustuer: number;
  readonly indoors: boolean;
  readonly tibik: TibikFrame;
  readonly karton: KartonState | null;
};

export const kartonBoundsOf = (k: KartonState) =>
  kartonBounds(FOUND_KARTON_SIZE, k.open);

export const kartonFlapsOf = (
  tibik: TibikFrame,
  k: KartonState,
  margin = 0,
): Obb[] => {
  const box = frame(
    torsoMatrix(RIG, asCharacter(tibik)),
    k.position,
    new Euler(...k.rotation),
  );
  return kartonFlapSolids(FOUND_KARTON_SIZE, k.open, 0, box, margin);
};

export const CHIN_CLEARANCE = OUTLINE + 0.014;

const RIM_TOP = TONNE.height + 0.02;
const TIP_END = 0.15;
const outOfBin = (u: number): Matrix4 => {
  const bin = binByName(SEARCHED_BIN);
  const item = bin.contents.find((i) => i.name === FOUND_SHEET)!;
  const half = kartonBounds(FOUND_KARTON_SIZE, 0).size[1] / 2;
  const thickness = kartonBounds(FOUND_KARTON_SIZE, 0).size[2] / 2;
  const lying = -0.1;
  const up = (angle: number) =>
    new Vector3(0, Math.cos(angle), Math.sin(angle));
  const center = new Vector3(...item.position).add(
    new Vector3(...bin.position),
  );
  const bottom = center.clone().addScaledVector(up(lying), -half);
  const rimZ = bin.position[2] + TONNE.depth / 2 - 0.02 - thickness;
  const pivot = new Vector3(center.x, RIM_TOP, rimZ);
  const leaning = Math.atan2(pivot.z - bottom.z, pivot.y - bottom.y);
  let angle: number;
  let base: Vector3;
  if (u < TIP_END) {
    angle = lying + (leaning - lying) * (u / TIP_END);
    base = bottom;
  } else {
    const v = (u - TIP_END) / (1 - TIP_END);
    angle = leaning + (0.9 - leaning) * v;
    const inside = pivot.distanceTo(bottom) * (1 - v);
    base = pivot.clone().addScaledVector(up(angle), -inside);
  }
  const position = base.addScaledVector(up(angle), half);
  return new Matrix4().compose(
    position,
    new Quaternion().setFromEuler(new Euler(-angle, Math.PI, 0, "YXZ")),
    new Vector3(1, 1, 1),
  );
};

export const OUT_OF_BIN = 0.7;
const TO_HIS_CHEST_FROM = 0.55;
const placeKarton = (tibik: TibikFrame, k: KartonState): KartonState => {
  if (k.pickup >= 1) {
    return k;
  }
  const toHands = smoothstep(Math.min(1, Math.max(0, (k.pickup - TO_HIS_CHEST_FROM) / (1 - TO_HIS_CHEST_FROM))));
  const pulled = outOfBin(smoothstep(Math.min(1, k.pickup / OUT_OF_BIN)));
  const local = torsoMatrix(RIG, asCharacter(tibik))
    .clone()
    .invert()
    .multiply(pulled);
  const from = { position: new Vector3(), rotation: new Quaternion() };
  local.decompose(from.position, from.rotation, new Vector3());
  const to = new Quaternion().setFromEuler(new Euler(...k.rotation));
  const position = from.position.lerp(new Vector3(...k.position), toHands);
  const rotation = new Euler().setFromQuaternion(
    from.rotation.slerp(to, toHands),
    "XYZ",
  );
  return {
    ...k,
    position: position.toArray(),
    rotation: [rotation.x, rotation.y, rotation.z],
  };
};

export { guardLid };
export { asCharacter };

export const solveTibik = (
  authored: TibikFrame,
  solids: readonly Solid[],
  t = 0,
  holds: readonly Hold[] = [],
  ground: Solid | readonly Solid[] = GROUND,
  clock?: ArmClock  ,
): TibikFrame => {
  const grounds: readonly Solid[] = Array.isArray(ground) ? ground : [ground];
  let tibik = asCharacter(authored);
  tibik = guardGround(tibik, ground);
  tibik = guardBody(
    tibik,
    solids.filter((s) => !grounds.includes(s)),
  );
  tibik = guardLean(tibik, solids);
  tibik = workArm(tibik, "leftArm", t, solids, holds, clock);
  tibik = workArm(tibik, "rightArm", t, solids, holds, clock);
  return {
    ...authored,
    position: tibik.position,
    rotationY: tibik.rotationY,
    pose: tibik.pose,
  };
};

export const holdKarton = (
  tibik: TibikFrame,
  authored: KartonState,
  solids: readonly Solid[],
  clock?: ArmClock  ,
) => {
  const karton = placeKarton(tibik, authored);
  const held = holdCarried(asCharacter(tibik), karton, kartonBoundsOf, solids, {
    clock,
    sideGrip: karton.sideGrip,
    movable: karton.pickup > 0,
    carrying: karton.pickup > 0 && karton.pickup < 1,
  });
  const clear = guardLeanNoDeeper(
    held.character,
    kartonFlapsOf(held.character, held.item, CHIN_CLEARANCE),
  );
  const { position, rotationY, pose } = clear;
  return { tibik: { ...tibik, position, rotationY, pose }, karton: held.item };
};

export const sceneSolids = (
  lids: readonly number[],
  holding: boolean,
  haustuer = 0,
  indoors = false,
): Solid[] => [
  ...worldSolids(lids, haustuer),
  ...binContentSolids(holding ? FOUND_SHEET : undefined),
  ...(indoors ? indoorSolids({ tibik: 0 }) : []),
];

const REACH_FOR_THE_BOX = 0.4;

const solve = (t: number, history: ArmHistory): PapiertonnenState => {
  const clock = { history: history.of("Tibik"), at: t };
  const lids = BINS.map((bin) =>
    guardLid(
      bin,
      bin.name === SEARCHED_BIN ? lidAt(t) : restingLid(bin, bin.lid),
    ),
  );
  const authored = tibikAt(t);
  const haustuer = papiertonnenHaustuerAt(t);
  const indoors = nearTheDoor(t);
  const solids = sceneSolids(lids, authored.holdingBox, haustuer, indoors);
  const tibik = solveTibik(authored, solids, t, PAPIERTONNEN_HOLDS, GROUND, clock);
  if (!tibik.holdingBox) {
    const reaching = kf(t, [SHOT_FOUND_BOX - REACH_FOR_THE_BOX, SHOT_FOUND_BOX], [0, 1]);
    if (reaching <= 0) return { lids, haustuer, indoors, tibik, karton: null };
    const onTheBox = holdKarton(tibik, kartonAt(t), solids, clock).tibik.pose;
    let reached = asCharacter(tibik);
    for (const which of ["leftArm", "rightArm"] as const) {
      const toward = withArm(reached, which, blendArm(tibik.pose[which], onTheBox[which], reaching));
      reached = settleArm(toward, solids, which, lastArm(clock, which));
      clock.history.remember(t, which, FINAL_ARM, reached.pose[which]);
    }
    return { lids, haustuer, indoors, tibik: { ...tibik, pose: reached.pose }, karton: null };
  }
  return { lids, haustuer, indoors, ...holdKarton(tibik, kartonAt(t), solids, clock) };
};

export const solvePapiertonnen = memoWithArms(TIMELINE_FPS, solve, [], openingOn(() => ({ Tibik: treppenhausEnd().tibik })));

export const papiertonnenEnd = () => solvePapiertonnen(PAPIERTONNEN_LAST_T);

export const heldKartonSolids = (state: PapiertonnenState): Obb[] => {
  if (!state.karton) return [];
  const b = kartonBoundsOf(state.karton);
  return [
    carriedBox(
      RIG,
      asCharacter(state.tibik),
      state.karton.position,
      state.karton.rotation,
      b.size,
      b.center,
    ),
    ...kartonFlapsOf(state.tibik, state.karton),
  ];
};

export const papiertonnenViolations = (state: PapiertonnenState): Contact[] => {
  const solids = sceneSolids(
    state.lids,
    state.karton !== null,
    state.haustuer,
    state.indoors,
  );
  const tibik = asCharacter(state.tibik);
  const found = [
    ...characterViolations(tibik, solids),
    ...BINS.flatMap((bin, i) =>
      contacts(tonneLidParts(bin.name, bin.position, state.lids[i]), [
        ...STREET_SOLIDS,
        ...binContentSolids(state.karton ? FOUND_SHEET : undefined),
      ]),
    ),
  ];
  if (state.karton) {
    const b = kartonBoundsOf(state.karton);
    const [box, ...flaps] = heldKartonSolids(state);
    found.push(
      ...contacts([box, ...flaps], solids),
      ...contacts(bodyColliders(RIG, tibik).head, [box, ...flaps]),
    );
    const intoBelly = boxIntoTorso(RIG, tibik, box);
    if (intoBelly > 0) {
      found.push({
        a: "carried box",
        b: "body",
        depth: intoBelly,
        normal: new Vector3(),
      });
    }
    const limbs = [
      ...armLimb(armColliders(RIG, tibik, "leftArm")),
      ...armLimb(armColliders(RIG, tibik, "rightArm")),
    ];
    found.push(...contacts(limbs, [box]));
    found.push(...gripGapViolations(tibik, state.karton, b));
  }
  return found;
};

export const headToKarton = (tibik: TibikFrame, k: KartonState) => {
  const b = kartonBoundsOf(k);
  const boxes = [
    carriedBox(
      RIG,
      asCharacter(tibik),
      k.position,
      k.rotation,
      b.size,
      b.center,
    ),
    ...kartonFlapsOf(tibik, k),
  ];
  let nearest = Infinity;
  for (const point of headSurface(asCharacter(tibik))) {
    const probe = sphere("head", point, 0);
    for (const box of boxes) {
      nearest = Math.min(nearest, sphereObbGap(probe, box));
    }
  }
  return nearest;
};

export const binContentViolations = (lids: readonly number[]): Contact[] => {
  const walls = BINS.flatMap((bin, i) =>
    tonneColliders(bin.name, bin.position, lids[i]),
  );
  return BINS.flatMap((bin) =>
    contacts(binItemColliders(bin), [...STREET_SOLIDS, ...walls]),
  );
};
