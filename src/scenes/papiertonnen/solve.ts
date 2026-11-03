import {
  collide,
  contacts,
  frame,
  obb,
  smallestClearing,
  sphere,
  sphereObbGap,
  type Contact,
  type Obb,
  type Solid,
} from "../../physics/collision";
import { armLimb, gripGaps, holdCarried } from "../../physics/grip";
import {
  characterViolations,
  guardArm,
  guardBody,
  guardGround,
  guardLean,
  type Character,
} from "../../physics/guards";
import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import { armColliders, bodyColliders, boxIntoTorso, carriedBox, torsoMatrix } from "../../characters/skeleton";
import { FOUND_KARTON_SIZE, kartonBounds, kartonFlaps } from "../../street/kartonShape";
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
  type BinSpec,
} from "../../street/layout";
import { restingLid } from "../../street/lids";
import { TONNE, tonneColliders, tonneLid } from "../../street/tonneShape";
import { headSurface } from "../../Tibik/headShape";
import { memoByFrame } from "../../physics/memoSolve";
import { RIG } from "../../Tibik/rig";
import { OUTLINE, type Vec3 } from "../../toon/primitives";
import { PAPIERTONNEN_DURATION, kartonAt, lidAt, tibikAt, type KartonState, type TibikFrame } from "./choreography";

export type PapiertonnenState = {
  readonly lids: readonly number[];
  readonly tibik: TibikFrame;
  readonly karton: KartonState | null;
};

export const kartonBoundsOf = (k: KartonState) => kartonBounds(FOUND_KARTON_SIZE, k.open);

export const kartonFlapsOf = (tibik: TibikFrame, k: KartonState, margin = 0): Obb[] => {
  const box = frame(torsoMatrix(RIG, asCharacter(tibik)), k.position, new Euler(...k.rotation));
  return kartonFlaps(FOUND_KARTON_SIZE, k.open).map((flap, i) =>
    obb(
      `box flap ${i + 1}`,
      frame(frame(box, flap.wall, new Euler(0, flap.angle, 0)), flap.hinge, new Euler(-flap.splay, 0, 0)),
      [flap.size[0] + 2 * margin, flap.size[1] + 2 * margin, flap.size[2] + 2 * margin],
      flap.center,
    ),
  );
};

const CHIN_CLEARANCE = OUTLINE + 0.014;

const RIM_TOP = 1.0;
const TIP_END = 0.15;
const outOfBin = (u: number): Matrix4 => {
  const bin = binByName(SEARCHED_BIN);
  const item = bin.contents.find((i) => i.name === FOUND_SHEET)!;
  const half = kartonBounds(FOUND_KARTON_SIZE, 0).size[1] / 2;
  const thickness = kartonBounds(FOUND_KARTON_SIZE, 0).size[2] / 2;
  const lying = -0.1;
  const up = (angle: number) => new Vector3(0, Math.cos(angle), Math.sin(angle));
  const center = new Vector3(...item.position).add(new Vector3(...bin.position));
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

const OUT_OF_BIN = 0.7;
const placeKarton = (tibik: TibikFrame, k: KartonState): KartonState => {
  if (k.pickup >= 1) {
    return k;
  }
  const toHands = Math.max(0, (k.pickup - OUT_OF_BIN) / (1 - OUT_OF_BIN));
  const pulled = outOfBin(Math.min(1, k.pickup / OUT_OF_BIN));
  const local = torsoMatrix(RIG, asCharacter(tibik)).clone().invert().multiply(pulled);
  const from = { position: new Vector3(), rotation: new Quaternion() };
  local.decompose(from.position, from.rotation, new Vector3());
  const to = new Quaternion().setFromEuler(new Euler(...k.rotation));
  const position = from.position.lerp(new Vector3(...k.position), toHands);
  const rotation = new Euler().setFromQuaternion(from.rotation.slerp(to, toHands), "XYZ");
  return { ...k, position: position.toArray() as Vec3, rotation: [rotation.x, rotation.y, rotation.z] };
};

export const guardLid = (bin: BinSpec, authored: number) => {
  const hits = (angle: number) => {
    const lid = tonneLid(bin.name, bin.position, angle);
    return Math.max(0, ...STREET_SOLIDS.map((s) => collide(lid, s)?.depth ?? 0));
  };
  if (hits(authored) <= 0) {
    return authored;
  }
  return authored - smallestClearing((back) => hits(authored - back), authored, 0.02);
};

export const asCharacter = (f: TibikFrame): TibikFrame & Character => ({ ...f, skeleton: RIG });

export const solveTibik = (authored: TibikFrame, solids: readonly Solid[]): TibikFrame => {
  let tibik = asCharacter(authored);
  tibik = guardGround(tibik, GROUND);
  tibik = guardBody(tibik, solids.filter((s) => s !== GROUND));
  tibik = guardLean(tibik, solids);
  tibik = guardArm(tibik, solids, "leftArm");
  tibik = guardArm(tibik, solids, "rightArm");
  return { ...authored, position: tibik.position, rotationY: tibik.rotationY, pose: tibik.pose };
};

export const holdKarton = (tibik: TibikFrame, authored: KartonState, solids: readonly Solid[]) => {
  const karton = placeKarton(tibik, authored);
  const held = holdCarried(asCharacter(tibik), karton, kartonBoundsOf, solids, {
    sideGrip: karton.sideGrip,
    movable: karton.pickup > 0,
  });
  const clear = guardLean(held.character, kartonFlapsOf(held.character, held.item, CHIN_CLEARANCE));
  const { position, rotationY, pose } = clear;
  return { tibik: { ...tibik, position, rotationY, pose }, karton: held.item };
};

export const sceneSolids = (lids: readonly number[], holding: boolean): Solid[] => [
  ...worldSolids(lids),
  ...binContentSolids(holding ? FOUND_SHEET : undefined),
];

const solve = (t: number): PapiertonnenState => {
  const lids = BINS.map((bin) => guardLid(bin, bin.name === SEARCHED_BIN ? lidAt(t) : restingLid(bin, bin.lid)));
  const authored = tibikAt(t);
  const solids = sceneSolids(lids, authored.holdingBox);
  const tibik = solveTibik(authored, solids);
  if (!tibik.holdingBox) {
    return { lids, tibik, karton: null };
  }
  return { lids, ...holdKarton(tibik, kartonAt(t), solids) };
};

export const solvePapiertonnen = memoByFrame(solve);

export const papiertonnenEnd = () => solvePapiertonnen(PAPIERTONNEN_DURATION - 1 / 30);

export const papiertonnenViolations = (state: PapiertonnenState): Contact[] => {
  const solids = sceneSolids(state.lids, state.karton !== null);
  const tibik = asCharacter(state.tibik);
  const found = [
    ...characterViolations(tibik, solids),
    ...BINS.flatMap((bin, i) =>
      contacts([tonneLid(bin.name, bin.position, state.lids[i])], [...STREET_SOLIDS, ...binContentSolids(state.karton ? FOUND_SHEET : undefined)]),
    ),
  ];
  if (state.karton) {
    const b = kartonBoundsOf(state.karton);
    const box = carriedBox(RIG, tibik, state.karton.position, state.karton.rotation, b.size, b.center);
    const flaps = kartonFlapsOf(state.tibik, state.karton);
    found.push(...contacts([box, ...flaps], solids), ...contacts(bodyColliders(RIG, tibik).head, [box, ...flaps]));
    const intoBelly = boxIntoTorso(RIG, tibik, box);
    if (intoBelly > 0) {
      found.push({ a: "carried box", b: "body", depth: intoBelly, normal: new Vector3() });
    }
    const limbs = [...armLimb(armColliders(RIG, tibik, "leftArm")), ...armLimb(armColliders(RIG, tibik, "rightArm"))];
    found.push(...contacts(limbs, [box]));
    for (const { which, gap } of gripGaps(tibik, state.karton, b)) {
      if (gap > 0) {
        found.push({ a: "carried box", b: `${which === "leftArm" ? "left" : "right"} hand (not touching it)`, depth: gap, normal: new Vector3() });
      }
    }
  }
  return found;
};

export const headToKarton = (tibik: TibikFrame, k: KartonState) => {
  const b = kartonBoundsOf(k);
  const boxes = [carriedBox(RIG, asCharacter(tibik), k.position, k.rotation, b.size, b.center), ...kartonFlapsOf(tibik, k)];
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
  const walls = BINS.flatMap((bin, i) => tonneColliders(bin.name, bin.position, lids[i]));
  return BINS.flatMap((bin) => contacts(binItemColliders(bin), [...STREET_SOLIDS, ...walls]));
};
