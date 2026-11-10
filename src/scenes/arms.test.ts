import { expect, test } from "vitest";
import type { Character } from "../physics/guards";
import type { Hold } from "../physics/holds";
import { asKaren } from "../Karen/character";
import { asCharacter } from "../Tibik/character";
import { FPS } from "../timeline";
import { storyJumpsIn } from "../toon/shots";
import { HAUSMUELL_DURATION, STOP_AT as KAREN_STOPS_RUNNING } from "./hausmuell/choreography";
import { solveHausmuell } from "./hausmuell/solve";
import { SHOTS as KLINGELSTURM_SHOTS } from "./klingelsturm/cameras";
import { KLINGELSTURM_DURATION } from "./klingelsturm/choreography";
import { TIBIK_LEFT_HOLDS, TIBIK_RIGHT_HOLDS, solveKlingelsturm } from "./klingelsturm/solve";
import { NACHTRUHE_HOLDS, solveNachtruhe } from "./nachtruhe/solve";
import { DUSK, NACHTRUHE_DURATION } from "./nachtruhe/timeline";
import { PAPIERTONNEN_DURATION, PAPIERTONNEN_HOLDS } from "./papiertonnen/choreography";
import { solvePapiertonnen } from "./papiertonnen/solve";
import { RUNDSCHREIBEN_DURATION, TO_DOOR } from "./rundschreiben/choreography";
import { solveRundschreiben } from "./rundschreiben/solve";
import { armJumps, handsOffHolds, legSnaps, tibikIn, tooFastToWalk } from "./sceneChecks";
import { HOLDS as TREPPENHAUS_HOLDS, STORY_END } from "./treppenhaus/choreography";
import { solveTreppenhaus } from "./treppenhaus/solve";

type Scene = {
  readonly name: string;
  readonly duration: number;
  readonly characters: (t: number) => Record<string, Character>;
  readonly cuts?: readonly number[];
};

const klingelsturmCast = (t: number): Record<string, Character> => {
  const s = solveKlingelsturm(t);
  return { Karen: asKaren(s.karen), ...(s.tibikHere ? { Tibik: asCharacter(s.tibik) } : {}) };
};

const SCENES: readonly Scene[] = [
  { name: "Treppenhaus", duration: STORY_END, characters: tibikIn(solveTreppenhaus) },
  { name: "Papiertonnen", duration: PAPIERTONNEN_DURATION, characters: tibikIn(solvePapiertonnen) },
  {
    name: "Hausmuell",
    duration: HAUSMUELL_DURATION,
    characters: (t) => {
      const s = solveHausmuell(t);
      return { Tibik: asCharacter(s.tibik), Karen: asKaren(s.karen) };
    },
  },
  {
    name: "Klingelsturm",
    duration: KLINGELSTURM_DURATION,
    characters: klingelsturmCast,
    cuts: storyJumpsIn(KLINGELSTURM_SHOTS),
  },
  { name: "Nachtruhe", duration: NACHTRUHE_DURATION, characters: tibikIn(solveNachtruhe), cuts: [DUSK[1]] },
  { name: "Rundschreiben", duration: RUNDSCHREIBEN_DURATION, characters: tibikIn(solveRundschreiben) },
];

const everyFrame = (duration: number, characters: Scene["characters"]) =>
  Array.from({ length: Math.floor(duration * FPS) + 1 }, (_, f) => {
    const t = Math.min(f / FPS, duration);
    return { t, characters: characters(t) };
  });

const STILL_FLIPPING: Readonly<Record<string, number>> = {
  Treppenhaus: 0,
  Papiertonnen: 2,
  Hausmuell: 0,
  Klingelsturm: 0,
  Nachtruhe: 0,
  Rundschreiben: 0,
};

test.each(SCENES)(
  "$name: every arm moves like an arm: from one frame to the next a joint swerving more than 0.65 rad off its course or a hand more than 30 cm, which a swinging arm never does and a solver flipping between poses always does, happens in no more frames than the few still waiting for a staging fix (274 film-wide before the arms remembered their last frame)",
  { timeout: 600_000 },
  ({ name, duration, characters, cuts }) => {
    const frames = everyFrame(duration, characters);
    const flips = armJumps(frames, cuts);
    expect(flips.length, flips.join("; ")).toBeLessThanOrEqual(STILL_FLIPPING[name]);
  },
);

const STILL_SNAPPING: Readonly<Record<string, number>> = { Treppenhaus: 3, Papiertonnen: 0, Hausmuell: 5, Klingelsturm: 4, Nachtruhe: 1, Rundschreiben: 1 };

test.each(SCENES)(
  "$name: every leg moves like a leg: a hip, knee or ankle bending more than 0.3 rad for a single frame and straight back the next — a knee locking straight at a footfall and snapping bent as the body passes over the foot — happens in no more frames than the few still waiting for a gait fix",
  { timeout: 600_000 },
  ({ name, duration, characters, cuts }) => {
    const frames = everyFrame(duration, characters);
    const snaps = legSnaps(frames, cuts);
    expect(snaps.length, snaps.join("; ")).toBeLessThanOrEqual(STILL_SNAPPING[name]);
  },
);

const EXCUSED: Readonly<Record<string, Readonly<Record<string, readonly [number, number]>>>> = {
  Hausmuell: { Karen: [0, KAREN_STOPS_RUNNING] },
  Rundschreiben: { Tibik: TO_DOOR },
};

test.each(SCENES)(
  "$name: nobody walks faster than a walk can go: over any 0.2 s, speed squared over g times leg length stays at most 0.6, since people of every leg length break into a run near 0.5 (excused: Karen's staged run, and his walk from the bins to the door in the rain, waiting on the owner)",
  { timeout: 600_000 },
  ({ name, duration, characters, cuts = [] }) => {
    const frames = everyFrame(duration, characters);
    expect(tooFastToWalk(frames, cuts, EXCUSED[name])).toEqual([]);
  },
);

const touching = (holds: readonly Hold[]) => [...new Set(holds)].filter((hold) => !hold.exact);

const HELD: readonly { readonly scene: string; readonly holds: readonly Hold[]; readonly at: (t: number) => Character | undefined }[] = [
  { scene: "Treppenhaus", holds: touching(TREPPENHAUS_HOLDS), at: (t) => tibikIn(solveTreppenhaus)(t).Tibik },
  { scene: "Papiertonnen", holds: touching(PAPIERTONNEN_HOLDS), at: (t) => tibikIn(solvePapiertonnen)(t).Tibik },
  { scene: "Klingelsturm", holds: touching([...TIBIK_LEFT_HOLDS, ...TIBIK_RIGHT_HOLDS]), at: (t) => klingelsturmCast(t)["Tibik"] },
  { scene: "Nachtruhe", holds: touching(NACHTRUHE_HOLDS), at: (t) => tibikIn(solveNachtruhe)(t).Tibik },
];

test.each(HELD)(
  "$scene: wherever Tibik's hand takes hold of something by touching it — a lever, a knob, a flap, the tape roll, a switch, a curtain — it is on it from the grip until it lets go, never more than 1.5 cm off it or sunk into it",
  { timeout: 600_000 },
  ({ holds, at }) => {
    const { frames, off } = handsOffHolds(holds, at);
    expect(frames).toBeGreaterThan(0);
    expect(off.slice(0, 6)).toEqual([]);
  },
);
