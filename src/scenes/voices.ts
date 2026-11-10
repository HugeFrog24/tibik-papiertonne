import { staticFile } from "remotion";
import type { Line } from "../dialogue/line";
import TAKES from "../dialogue/takes.json";
import VOICE_EFFECTS from "../dialogue/voiceEffects.json";
import type { SoundCue } from "../sound/SoundCues";
import { TIMELINE_FPS } from "../frameRate";
import { takeIdOf, voiceOf } from "./recordingScript";

export type Language = keyof typeof TAKES;

export type Effect = keyof typeof VOICE_EFFECTS;

export type Take = { readonly file: string; readonly seconds: number; readonly speech: readonly (readonly number[])[] };

export const VOICE = { attack: 0.05, release: 0.1, volume: 1 };

type EffectSpec = { readonly voices: readonly string[]; readonly takes: readonly string[]; readonly tail: number; readonly volume: number; readonly inside?: string };

const EFFECTS = Object.entries(VOICE_EFFECTS) as [Effect, EffectSpec][];

const insideOf = (effect: Effect | undefined) => (effect ? ((VOICE_EFFECTS[effect] as EffectSpec).inside as Effect | undefined) : undefined);

const roomsBetween = (from: number, to: number, inside?: (t: number) => boolean): (readonly [number, number, boolean])[] => {
  if (!inside) return [[from, to, false]];
  const rooms: (readonly [number, number, boolean])[] = [];
  let start = from;
  let current = inside(from);
  for (let frame = Math.floor(from * TIMELINE_FPS) + 1; frame / TIMELINE_FPS < to; frame++) {
    const now = inside(frame / TIMELINE_FPS);
    if (now === current) continue;
    rooms.push([start, frame / TIMELINE_FPS, current]);
    start = frame / TIMELINE_FPS;
    current = now;
  }
  rooms.push([start, to, current]);
  return rooms;
};

export const effectOf = (line: Line): Effect | undefined =>
  EFFECTS.find(([, effect]) => effect.voices.includes(voiceOf(line)) || effect.takes.includes(takeIdOf(line) ?? ""))?.[0];

export const takeOf = (lang: Language, id: string): Take | undefined => (TAKES[lang] as Readonly<Record<string, Take>>)[id];

export const LEVELED = "level";

export const processedFile = (effect: Effect | undefined, take: Take) => `${effect ?? LEVELED}/${take.file.replace(/\.[^.]+$/, ".wav")}`;

export const voiceCues = (lines: readonly Line[], lang: Language = "de", inside?: (t: number) => boolean): SoundCue[] =>
  lines.flatMap((line) => {
    const take = takeOf(lang, takeIdOf(line) ?? "");
    if (take?.speech.length !== 1) return [];
    const effect = effectOf(line);
    const tail = effect ? VOICE_EFFECTS[effect].tail : 0;
    const [start, end] = take.speech[0];
    const skip = Math.max(0, start - VOICE.attack);
    const at = line.from - (start - skip);
    const length = Math.min(take.seconds + tail, end + VOICE.release + tail) - skip;
    const alternative = insideOf(effect);
    const rooms = roomsBetween(at, at + length, alternative ? inside : undefined);
    return rooms.map(([from, to, isInside]) => {
      const playing = isInside ? alternative : effect;
      return {
        name: rooms.length > 1 ? `${line.name} ${playing}@${from.toFixed(3)}` : line.name,
        at: from,
        src: staticFile(`dialogue/${lang}/${processedFile(playing, take)}`),
        volume: playing ? VOICE_EFFECTS[playing].volume : VOICE.volume,
        skip: skip + (from - at),
        length: to - from,
      };
    });
  });
