import { Vector3 } from "three";
import {
  armColliders,
  allColliders,
  bodyColliders,
  boxIntoTorso,
  carriedBox,
} from "../../characters/skeleton";
import { asKaren } from "../../Karen/character";
import { contacts, type Contact, type Solid } from "../../physics/collision";
import { armLimb, gripGapViolations } from "../../physics/grip";
import {
  characterViolations,
  guardBody,
  guardGround,
  guardLean,
  type Character,
} from "../../physics/guards";
import {
  type KartonState,
  type TibikFrame,
} from "../papiertonnen/choreography";
import {
  asCharacter,
  holdKarton,
  kartonBoundsOf,
  kartonFlapsOf,
  papiertonnenEnd,
  sceneSolids,
  solveTibik,
} from "../papiertonnen/solve";
import { GROUND } from "../../street/layout";
import { memoWithArms, openingOn } from "../../physics/memoSolve";
import type { ArmClock, ArmHistory } from "../../physics/armHistory";
import { workArm } from "../../physics/holds";
import { TIMELINE_FPS } from "../../frameRate";
import { RIG } from "../../Tibik/rig";
import {
  HAUSMUELL_DURATION,
  karenAt,
  kartonAt,
  tibikAt,
  type KarenFrame,
} from "./choreography";

export type HausmuellState = {
  readonly lids: readonly number[];
  readonly tibik: TibikFrame;
  readonly karton: KartonState;
  readonly karen: KarenFrame;
};

const allSpheres = (c: Character) => allColliders(c.skeleton, c);

export const tibikBox = (tibik: TibikFrame, karton: KartonState) => {
  const b = kartonBoundsOf(karton);
  return carriedBox(
    RIG,
    tibik,
    karton.position,
    karton.rotation,
    b.size,
    b.center,
  );
};

const solveKaren = (
  authored: KarenFrame,
  solids: readonly Solid[],
  { history, at }: ArmClock,
): KarenFrame => {
  let karen = asKaren(authored);
  karen = guardGround(karen, GROUND);
  karen = guardBody(
    karen,
    solids.filter((s) => s !== GROUND),
  );
  karen = guardLean(karen, solids);
  karen = workArm(karen, "leftArm", at, solids, [], { history, at });
  karen = workArm(karen, "rightArm", at, solids, [], { history, at });
  return {
    ...authored,
    position: karen.position,
    rotationY: karen.rotationY,
    pose: karen.pose,
  };
};

const LIDS = () => papiertonnenEnd().lids;

const solve = (t: number, history: ArmHistory): HausmuellState => {
  const tibikClock = { history: history.of("Tibik"), at: t };
  const lids = LIDS();
  const world = sceneSolids(lids, true);
  const karenAuthored = karenAt(t);
  const forTibik = [...world, ...allSpheres(asKaren(karenAuthored))];
  const tibikSolved = holdKarton(
    solveTibik(tibikAt(t), forTibik, t, [], GROUND, tibikClock),
    kartonAt(t),
    forTibik,
    tibikClock,
  );
  const karen = solveKaren(karenAuthored, [
    ...world,
    ...allSpheres(asCharacter(tibikSolved.tibik)),
    tibikBox(tibikSolved.tibik, tibikSolved.karton),
    ...kartonFlapsOf(tibikSolved.tibik, tibikSolved.karton),
  ], { history: history.of("Karen"), at: t });
  return { lids, tibik: tibikSolved.tibik, karton: tibikSolved.karton, karen };
};

export const solveHausmuell = memoWithArms(TIMELINE_FPS, solve, [], openingOn(() => ({ Tibik: papiertonnenEnd().tibik })));
export const hausmuellEnd = () => solveHausmuell(HAUSMUELL_DURATION);

export const hausmuellViolations = (state: HausmuellState): Contact[] => {
  const world = sceneSolids(state.lids, true);
  const tibik = asCharacter(state.tibik);
  const karen = asKaren(state.karen);
  const box = tibikBox(state.tibik, state.karton);
  const flaps = kartonFlapsOf(state.tibik, state.karton);
  const found = [
    ...characterViolations(tibik, [...world, ...allSpheres(karen)]),
    ...characterViolations(karen, [...world, box, ...flaps]),
    ...contacts([box, ...flaps], world),
    ...contacts(bodyColliders(RIG, tibik).head, [box, ...flaps]),
    ...contacts(
      [
        ...armLimb(armColliders(RIG, tibik, "leftArm")),
        ...armLimb(armColliders(RIG, tibik, "rightArm")),
      ],
      [box],
    ),
  ];
  const intoBelly = boxIntoTorso(RIG, tibik, box);
  if (intoBelly > 0) {
    found.push({
      a: "carried box",
      b: "Tibik's body",
      depth: intoBelly,
      normal: new Vector3(),
    });
  }
  found.push(
    ...gripGapViolations(tibik, state.karton, kartonBoundsOf(state.karton)),
  );
  return found;
};
