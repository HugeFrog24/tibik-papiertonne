import { touchdownTimes } from "../../characters/gait";
import { FPS } from "../../timeline";
import { SHOTS, shotAt } from "./cameras";
import { KEYS, phoneCues } from "./calls";
import { KLINGELSTURM_DURATION, bellStorm } from "./choreography";
import { OPEN, SHUT, UNLATCH, tibikGait } from "./door";
import { EXIT_SOUNDS } from "./exit";
import { LIGHT, LIGHT_BACK } from "./light";
import { PACKING, TAPING } from "./parcel";
import { round6 } from "../../characters/scalar";

export type BellCue = {
  readonly name: string;
  readonly at: number;
  readonly sound: string;
  readonly volume: number;
  readonly length?: number;
  readonly skip?: number;
};

type Version = {
  readonly sound: string;
  readonly volume: number;
  readonly label: string;
};

const INSIDE = { sound: "phone/bell-storm", volume: 0.6 };
const THROUGH = { sound: "stairwell/phone/bell-storm-door", volume: 0.8 };
const TAPE_PULL = { sound: "flur/tape-pull", lead: 0.04, volume: 0.9 };

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
    return throughTheCuts(cue.name, cue.at, cue.length, inside, outside);
  });

const tapeCues = (): BellCue[] => [
  {
    name: "Tibik pulls the tape across the lid",
    at: round6(TAPING.start - TAPE_PULL.lead),
    sound: TAPE_PULL.sound,
    volume: TAPE_PULL.volume,
  },
];

const RELAY = { sound: "stairwell/relay", volume: 0.7 };

const relayCues = (): BellCue[] => [
  { name: "The timer relay clicks", at: LIGHT.out, ...RELAY },
  { name: "The timer relay pulls in", at: round6(LIGHT_BACK[0]), ...RELAY },
];

const STEP_SOUNDS = 4;
const OUT_ON_THE_LANDING = 0.3;

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
  const steps = touchdownTimes(tibikGait(), KLINGELSTURM_DURATION, FPS);
  const behind = steps.filter(
    (t) => !inTheFlur(t) && t < EXIT_SOUNDS.doorOpens,
  );
  const out = steps.filter((t) => t >= EXIT_SOUNDS.doorOpens);
  return [
    ...behind.map((at, i) => ({
      name: `Tibik steps behind his door @${at}`,
      at,
      sound: `flur/footstep-door-${i % STEP_SOUNDS}`,
      volume: 0.8,
    })),
    ...out.map((at, i) => ({
      name: `Tibik steps out @${at}`,
      at,
      sound: `stairwell/footstep_concrete_00${i % STEP_SOUNDS}`,
      volume: OUT_ON_THE_LANDING,
      length: KLINGELSTURM_DURATION - at,
    })),
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
    sound: "stairwell/switch_002",
    volume: 0.6,
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
];
