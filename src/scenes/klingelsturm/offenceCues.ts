import { decibelGain, plusMinus, round6 } from "../../characters/scalar";
import { nuanceAt, takeAt } from "../../sound/takes";
import { BANGING } from "./banging";
import { heardUntilIn } from "../../toon/shots";
import { SHOTS } from "./cameras";
import { CODA } from "./cigarette";
import type { BellCue } from "./doorCues";

export const BLOW_TAKES = [0, 1, 2, 3, 4] as const;
const RATTLE_AFTER = 0.01;
const BLOW_LEVEL = { spread: 0.8, tired: -1.2, tiredFrom: 4 };
const SETTLES = { after: 0.18, volume: 0.5 };

const blowGain = (i: number) => decibelGain(i >= BLOW_LEVEL.tiredFrom ? BLOW_LEVEL.tired : plusMinus(`her blow ${i}`) * BLOW_LEVEL.spread);
const ON_THE_LANDING = { blow: 1.45, rattle: 0.2 };
const IN_HIS_FLUR = { blow: 0.8, rattle: 0.13 };

const blowTake = (i: number) => BLOW_TAKES[takeAt("her blows", i, BLOW_TAKES.length)];

const latchRattle = (name: string, at: number, take: number, flur: boolean, scale: number): BellCue => ({
  name,
  at,
  sound: flur ? `pound/latch-rattle-${take}` : `stairwell/pound/latch-rattle-${take}`,
  volume: (flur ? IN_HIS_FLUR.rattle : ON_THE_LANDING.rattle) * scale,
});

const latchSettles = (inTheFlur: (t: number) => boolean): BellCue => {
  const at = round6(BANGING.blows[BANGING.blows.length - 1] + SETTLES.after);
  return latchRattle("His door settles on its latch", at, blowTake(BANGING.blows.length), inTheFlur(at), SETTLES.volume);
};

export const blowCues = (inTheFlur: (t: number) => boolean): BellCue[] => [
  ...BANGING.blows.flatMap((at, i) => {
    const take = blowTake(i);
    const flur = inTheFlur(at);
    return [
      {
        name: `Her fist on his door ${i + 1}`,
        at,
        sound: flur ? `flur/door-pound-${take}` : `stairwell/pound/door-pound-${take}`,
        volume: (flur ? IN_HIS_FLUR.blow : ON_THE_LANDING.blow) * blowGain(i),
        ...(!flur && at < BANGING.flurCut[0] ? { length: round6(BANGING.flurCut[0] - at) } : {}),
      },
      latchRattle(`His latch rattles ${i + 1}`, round6(at + RATTLE_AFTER), take, flur, blowGain(i)),
    ];
  }),
  latchSettles(inTheFlur),
];

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
    ...CODA.strikes.map((strike, i) => ({
      name: i === 0 ? "The flint wheel strikes, only sparks" : "The flint wheel strikes",
      at: round6(strike - SPARK_INTO_THE_STRIKE),
      sound: coda("lighter-strike"),
      volume: round6(SMOKING.strike * nuanceAt("lighter-strike", i).gain),
    })),
    over("The gas puffs", "lighter-hiss", CODA.coldStart, SMOKING.hiss),
    { name: "The gas lever snaps back on the cold lighter", at: CODA.coldStart[1], sound: coda("lighter-release"), volume: SMOKING.release },
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
