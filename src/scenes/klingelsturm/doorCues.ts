import { ambienceOf } from "../../street/sceneAmbience";
import { touchdownTimes } from "../../characters/gait";
import { SHOTS, cameraAt, shotAt } from "./cameras";
import { KEYS, phoneCues } from "./calls";
import { KLINGELSTURM_DURATION, LINES, bellStorm } from "./choreography";
import { duckUnderLines } from "../../sound/duck";
import { OPEN, SHUT, UNLATCH, tibikAt, tibikGait } from "./door";
import { EXIT_SOUNDS } from "./exit";
import { LIGHT, LIGHT_BACK } from "./light";
import { PACKING, TAPE_STRIPS } from "./parcel";
import { round6, windowUnit } from "../../characters/scalar";
import { blowCues, codaCues, cutAtTheJump } from "./offenceCues";
import { CODA } from "./cigarette";
import { distanceBetween, heardFrom } from "../../sound/perspective";
import { nuancedTake } from "../../sound/takes";
import { FOOTSTEP_TAKES, footstepName } from "../../sound/footsteps";
import { LIGHT_SWITCH, TIMER_RELAY } from "../../sound/stairwellLight";
import type { SoundCue } from "../../sound/SoundCues";

export type BellCue = Omit<SoundCue, "src"> & { readonly sound: string };

type Version = {
  readonly sound: string;
  readonly volume: number;
  readonly label: string;
};

const INSIDE = { sound: "phone/bell-storm", volume: 0.6 };
const THROUGH = { sound: "stairwell/phone/bell-storm-door", volume: 0.8 };
export const TAPE_PULL = { sound: "flur/tape-pull", door: "flur/tape-pull-door", seconds: 2.19, lead: 0.04, volume: 0.9 };

export const inTheFlur = (t: number) => shotAt(t).name.startsWith("Flur:");

export const stompRoomAt = (t: number): "door" | "stairwell" =>
  inTheFlur(t) ? "door" : "stairwell";

const cuts = () =>
  SHOTS.filter((s) => s.name.startsWith("Flur:")).flatMap((s) => [
    s.from,
    s.to,
  ]);

const throughTheCuts = (
  name: string,
  at: number,
  length: number,
  inside: Version | null,
  outside: Version,
  fadeOut?: number  ,
): BellCue[] => {
  const end = at + length;
  const marks = [at, ...cuts().filter((c) => c > at && c < end), end];
  return marks.slice(0, -1).flatMap((from, i) => {
    const where = inTheFlur((from + marks[i + 1]) / 2) ? inside : outside;
    return where === null
      ? []
      : [
          {
            name: `${name} ${where.label} @${round6(from)}`,
            at: round6(from),
            length: round6(marks[i + 1] - from),
            skip: from > at ? round6(from - at) : undefined,
            sound: where.sound,
            volume: where.volume,
            ...(fadeOut === undefined ? {} : { fadeOut, restAfter: round6(end - marks[i + 1]) }),
          },
        ];
  });
};

export const bellCues = (): BellCue[] => {
  const storm = bellStorm();
  return throughTheCuts(
    "Bell",
    storm.at,
    storm.length,
    { ...INSIDE, label: "in his Flur" },
    { ...THROUGH, label: "through his door" },
  );
};

const herPhone = (): BellCue[] =>
  phoneCues().flatMap((cue) => {
    const outside = {
      sound: `stairwell/phone/${cue.sound}`,
      volume: cue.volume,
      label: "on the landing",
    };
    if (cue.length === undefined)
      return inTheFlur(cue.at) ? [] : [{ ...cue, sound: outside.sound }];
    const inside =
      cue.sound === "panting"
        ? {
            sound: "stairwell/phone/panting-door",
            volume: cue.volume,
            label: "through his door",
          }
        : null;
    return throughTheCuts(cue.name, cue.at, cue.length, inside, outside, cue.fadeOut);
  });

const tapeCues = (): BellCue[] =>
  TAPE_STRIPS.flatMap(({ name, times }) =>
    throughTheCuts(
      `Tibik pulls the tape ${name}`,
      round6(times.start - TAPE_PULL.lead),
      TAPE_PULL.seconds,
      { sound: TAPE_PULL.sound, volume: TAPE_PULL.volume, label: "in his Flur" },
      { sound: TAPE_PULL.door, volume: TAPE_PULL.volume, label: "through his door" },
    ),
  );

const RELAY = { sound: `stairwell/${TIMER_RELAY.file}`, volume: TIMER_RELAY.volume };

const relayCues = (): BellCue[] => [
  { name: "The timer relay clicks", at: LIGHT.out, ...RELAY },
  { name: "The timer relay pulls in", at: round6(LIGHT_BACK[0]), ...RELAY },
  { name: "The timer relay clicks again", at: CODA.outAgain, ...RELAY },
];

const DOOR_STEP_TAKES = 4;
const OUT_ON_THE_LANDING = 0.3;
const HEARD_PLAINLY_WITHIN = 2.5;
const SOUNDS_FAR_BEYOND = 5;


const hisDoorCues = (): BellCue[] => [
  {
    name: "His latch gives",
    at: UNLATCH[0],
    sound: "stairwell/metalLatch",
    volume: 0.7,
  },
  {
    name: "His door opens to the slit",
    at: OPEN[0],
    sound: "stairwell/doorOpen_1",
    volume: 0.6,
    length: 0.8,
  },
  {
    name: "His door shuts",
    at: SHUT[1],
    sound: "stairwell/doorClose_1",
    volume: 0.8,
  },
  {
    name: "His latch catches",
    at: round6(SHUT[1] + 0.03),
    sound: "stairwell/metalLatch",
    volume: 0.7,
  },
];

const hisSteps = (): BellCue[] => {
  const steps = touchdownTimes(tibikGait(), KLINGELSTURM_DURATION);
  const behind = steps.filter(
    (t) => !inTheFlur(t) && t < EXIT_SOUNDS.doorOpens,
  );
  const out = steps.filter((t) => t >= EXIT_SOUNDS.doorOpens && t < CODA.jumpCut);
  return [
    ...behind.map((at, i) => {
      const { take, rate, gain } = nuancedTake("flur:door", i, DOOR_STEP_TAKES);
      return {
        name: `Tibik steps behind his door @${at}`,
        at,
        sound: `flur/footstep-door-${take}`,
        volume: 0.8 * gain,
        rate,
      };
    }),
    ...out.flatMap((at, i) => {
      const distance = distanceBetween(tibikAt(at).position, cameraAt(at).position);
      const level = OUT_ON_THE_LANDING * heardFrom(distance, HEARD_PLAINLY_WITHIN);
      const far = windowUnit(distance, [HEARD_PLAINLY_WITHIN, SOUNDS_FAR_BEYOND]);
      const step = nuancedTake("stairwell:out", i, FOOTSTEP_TAKES.concrete);
      const { rate, gain } = step;
      const take = `stairwell/${footstepName("concrete", step.take)}`;
      return [
        { name: `Tibik steps out @${at}`, at, sound: take, volume: level * gain * (1 - far), rate },
        { name: `Tibik steps out, far off @${at}`, at, sound: `${take}-far`, volume: level * gain * far, rate },
      ]
        .filter((cue) => cue.volume > 0)
        .map(cutAtTheJump);
    }),
  ];
};

const exitCues = (): BellCue[] => [
  {
    name: "His door unlatches and swings open",
    at: round6(EXIT_SOUNDS.doorOpens),
    sound: "stairwell/doorOpen_1",
    volume: 0.55,
  },
  {
    name: "His door shuts behind him",
    at: round6(EXIT_SOUNDS.doorShuts),
    sound: "stairwell/doorClose_1",
    volume: 0.7,
  },
  {
    name: "His latch catches behind him",
    at: round6(EXIT_SOUNDS.doorShuts + 0.03),
    sound: "stairwell/metalLatch",
    volume: 0.5,
  },
  {
    name: "He switches the light back on",
    at: round6(EXIT_SOUNDS.lightSwitch),
    sound: `stairwell/${LIGHT_SWITCH.file}`,
    volume: LIGHT_SWITCH.volume,
  },
];

const flapCues = (): BellCue[] =>
  [PACKING.ends, PACKING.near[1], PACKING.far[1]].map((at, i) => ({
    name: `A flap folds down ${i + 1}`,
    at,
    sound: "flur/flap",
    volume: 0.5,
  }));

const hangUpCues = (): BellCue[] => [
  {
    name: "Her red key",
    at: KEYS[1].at,
    sound: "stairwell/phone/click",
    volume: 0.4,
  },
];

export const doorCues = (): BellCue[] => [
  ...bellCues(),
  ...herPhone(),
  ...tapeCues(),
  ...relayCues(),
  ...hisDoorCues(),
  ...hisSteps(),
  ...flapCues(),
  ...hangUpCues(),
  ...exitCues(),
  ...blowCues(inTheFlur),
  ...codaCues(),
];

export const KLINGELSTURM_AMBIENCE = ambienceOf({ indoors: () => 1, duck: duckUnderLines("klingelsturm", () => LINES) });
