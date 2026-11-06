import { round6 } from "../../characters/scalar";
import { BANGING } from "./banging";
import { heardUntilIn } from "../../toon/shots";
import { SHOTS } from "./cameras";
import { CODA } from "./cigarette";
import type { BellCue } from "./doorCues";

export const BLOW_TAKES = [0, 1, 2, 3, 4] as const;
const RATTLE_AFTER = 0.01;
const ON_THE_LANDING = { blow: 1.0, rattle: 0.15 };
const IN_HIS_FLUR = { blow: 0.85, rattle: 0.12 };

export const blowCues = (inTheFlur: (t: number) => boolean): BellCue[] =>
  BANGING.blows.flatMap((at, i) => {
    const take = BLOW_TAKES[i % BLOW_TAKES.length];
    const flur = inTheFlur(at);
    return [
      {
        name: `Her fist on his door ${i + 1}`,
        at,
        sound: flur ? `flur/door-blow-${take}` : `stairwell/impactWood_heavy_00${take}`,
        volume: flur ? IN_HIS_FLUR.blow : ON_THE_LANDING.blow,
      },
      {
        name: `His latch rattles ${i + 1}`,
        at: round6(at + RATTLE_AFTER),
        sound: flur ? `flur/latch-rattle-${take}` : `stairwell/impactMetal_light_00${take}`,
        volume: flur ? IN_HIS_FLUR.rattle : ON_THE_LANDING.rattle,
      },
    ];
  });

export const heardUntil = heardUntilIn(SHOTS, CODA.end);

export const cutAtTheJump = (cue: BellCue): BellCue => ({
  ...cue,
  length: round6(Math.min(cue.length ?? Infinity, heardUntil(cue.at) - cue.at)),
});

const SMOKING = { cloth: 0.5, strike: 0.6, hiss: 0.08, release: 0.15, drag: 0.15, inhale: 0.12, exhale: 0.3 };

const SPARK_INTO_THE_STRIKE = 0.11;

const coda = (name: string) => `stairwell/coda/${name}`;

const over = (name: string, sound: string, [from, to]: readonly [number, number], volume: number): BellCue => ({
  name,
  at: from,
  sound: coda(sound),
  volume,
  length: round6(to - from),
});

export const codaCues = (): BellCue[] =>
  [
    { name: "Her phone goes into her pocket", at: CODA.phoneAway[0], sound: "stairwell/cloth2", volume: SMOKING.cloth },
    { name: "The flint wheel strikes", at: round6(CODA.flick - SPARK_INTO_THE_STRIKE), sound: coda("lighter-strike"), volume: SMOKING.strike },
    over("The gas hisses", "lighter-hiss", CODA.flame, SMOKING.hiss),
    { name: "The gas lever snaps back", at: CODA.flame[1], sound: coda("lighter-release"), volume: SMOKING.release },
    ...[...CODA.draws, CODA.laterDraw].map((draw, i) => over(`The cigarette crackles ${i + 1}`, "drag", draw, SMOKING.drag)),
    ...(
      [
        [CODA.draws[0][0], CODA.exhale[0]],
        [CODA.laterDraw[0], CODA.darkExhale[0]],
      ] as const
    ).map((breath, i) => over(`She inhales ${i + 1}`, "inhale", breath, SMOKING.inhale)),
    ...[CODA.exhale, CODA.darkExhale].map(([at], i) => ({ name: `She blows out the smoke ${i + 1}`, at, sound: coda("exhale"), volume: SMOKING.exhale })),
  ].map(cutAtTheJump);
