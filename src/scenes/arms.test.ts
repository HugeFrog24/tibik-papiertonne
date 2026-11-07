import { expect, test } from "vitest";
import type { Character } from "../physics/guards";
import { asKaren } from "../Karen/character";
import { asCharacter } from "../Tibik/character";
import { FPS } from "../timeline";
import { storyJumpsIn } from "../toon/shots";
import { HAUSMUELL_DURATION } from "./hausmuell/choreography";
import { solveHausmuell } from "./hausmuell/solve";
import { SHOTS as KLINGELSTURM_SHOTS } from "./klingelsturm/cameras";
import { KLINGELSTURM_DURATION } from "./klingelsturm/choreography";
import { solveKlingelsturm } from "./klingelsturm/solve";
import { solveNachtruhe } from "./nachtruhe/solve";
import { NACHTRUHE_DURATION } from "./nachtruhe/timeline";
import { PAPIERTONNEN_DURATION } from "./papiertonnen/choreography";
import { solvePapiertonnen } from "./papiertonnen/solve";
import { RUNDSCHREIBEN_DURATION } from "./rundschreiben/choreography";
import { solveRundschreiben } from "./rundschreiben/solve";
import { armJumps } from "./sceneChecks";
import { STORY_END } from "./treppenhaus/choreography";
import { solveTreppenhaus } from "./treppenhaus/solve";

type Scene = {
  readonly name: string;
  readonly duration: number;
  readonly characters: (t: number) => Record<string, Character>;
  readonly cuts?: readonly number[];
};

const SCENES: readonly Scene[] = [
  { name: "Treppenhaus", duration: STORY_END, characters: (t) => ({ Tibik: asCharacter(solveTreppenhaus(t).tibik) }) },
  { name: "Papiertonnen", duration: PAPIERTONNEN_DURATION, characters: (t) => ({ Tibik: asCharacter(solvePapiertonnen(t).tibik) }) },
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
    characters: (t) => {
      const s = solveKlingelsturm(t);
      return { Karen: asKaren(s.karen), ...(s.tibikHere ? { Tibik: asCharacter(s.tibik) } : {}) };
    },
    cuts: storyJumpsIn(KLINGELSTURM_SHOTS),
  },
  { name: "Nachtruhe", duration: NACHTRUHE_DURATION, characters: (t) => ({ Tibik: asCharacter(solveNachtruhe(t).tibik) }) },
  { name: "Rundschreiben", duration: RUNDSCHREIBEN_DURATION, characters: (t) => ({ Tibik: asCharacter(solveRundschreiben(t).tibik) }) },
];

const STILL_FLIPPING: Readonly<Record<string, number>> = {
  Treppenhaus: 2,
  Papiertonnen: 6,
  Hausmuell: 0,
  Klingelsturm: 3,
  Nachtruhe: 6,
  Rundschreiben: 11,
};

test.each(SCENES)(
  "$name: every arm moves like an arm: from one frame to the next a joint swerving more than 0.65 rad off its course or a hand more than 30 cm, which a swinging arm never does and a solver flipping between poses always does, happens in no more frames than the few still waiting for a staging fix (274 film-wide before the arms remembered their last frame)",
  { timeout: 600_000 },
  ({ name, duration, characters, cuts }) => {
    const frames = Array.from({ length: Math.floor(duration * FPS) + 1 }, (_, f) => {
      const t = Math.min(f / FPS, duration);
      return { t, characters: characters(t) };
    });
    const flips = armJumps(frames, cuts);
    expect(flips.length, flips.join("; ")).toBeLessThanOrEqual(STILL_FLIPPING[name]);
  },
);
