import { existsSync, readdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { expect, test } from "vitest";
import { sourceFiles } from "../tooling/sourceFiles";
import TAKES from "../dialogue/takes.json";
import VOICE_EFFECTS from "../dialogue/voiceEffects.json";
import VOICE_LOUDNESS from "../dialogue/voiceLoudness.json";
import { takeIdOf, voiceOf } from "./recordingScript";
import { ALL_SPOKEN_LINES, SPOKEN } from "./spokenLines";
import { LINES as KLINGELSTURM_LINES } from "./klingelsturm/choreography";
import { inTheFlur } from "./klingelsturm/doorCues";
import { LANGUAGES, VOICE, effectOf, processedFile, takeOf, voiceCues } from "./voices";

const AWAITING_THE_OWNER: readonly string[] = [];

const inEveryLanguage = <T>(items: readonly T[]) => LANGUAGES.flatMap((lang) => items.map((item) => [lang, item] as const));

const idOf = (name: string) => takeIdOf(ALL_SPOKEN_LINES.find((l) => l.name === name)!)!;

test("every line in the film plays its own German take, except the ones in shared files while the owner checks them", () => {
  const playing = new Set(voiceCues(ALL_SPOKEN_LINES, "de").map((cue) => idOf(cue.name)));
  expect(ALL_SPOKEN_LINES.map((line) => takeIdOf(line)!).filter((id) => !playing.has(id))).toEqual(AWAITING_THE_OWNER);
});

test("each voice is heard where it is: the phone voices through a telephone, the letter as his inner voice, the far EY from down the street, everyone else as recorded", () => {
  expect(ALL_SPOKEN_LINES.filter((line) => effectOf(line) === "phone").map((line) => voiceOf(line))).toEqual(["anrufbeantworter", "anrufbeantworter", "anrufbeantworter", "leitstelle", "leitstelle"]);
  expect(ALL_SPOKEN_LINES.filter((line) => effectOf(line) === "inner").every((line) => voiceOf(line) === "tibik-inner")).toBe(true);
  expect(ALL_SPOKEN_LINES.filter((line) => effectOf(line) === "inner")).toHaveLength(5);
  expect(ALL_SPOKEN_LINES.filter((line) => effectOf(line) === "far").map((line) => line.text)).toEqual(["EY!"]);
  expect(ALL_SPOKEN_LINES.filter((line) => effectOf(line) === undefined).every((line) => ["tibik", "karen"].includes(voiceOf(line)) && !line.far)).toBe(true);
});

test("the telephone keeps to a phone's band, which a phone speaker plays too: nothing below 300 Hz, nothing above 3.4 kHz", () => {
  const chain = VOICE_EFFECTS.phone.filter;
  expect(Number(/highpass=f=(\d+)/.exec(chain)![1])).toBeGreaterThanOrEqual(300);
  expect(Number(/lowpass=f=(\d+)/.exec(chain)![1])).toBeLessThanOrEqual(3400);
});

test("each take is placed so its speech starts exactly at its line's start, keeping a little attack before it and its decay, and any echo, after", () => {
  for (const cue of voiceCues(ALL_SPOKEN_LINES, "de")) {
    const line = ALL_SPOKEN_LINES.find((l) => l.name === cue.name)!;
    const take = takeOf("de", takeIdOf(line)!)!;
    const effect = effectOf(line);
    const tail = effect ? VOICE_EFFECTS[effect].tail : 0;
    const [start, end] = take.speech[0];
    const skip = cue.skip ?? 0;
    expect(cue.at + (start - skip), cue.name).toBeCloseTo(line.from, 9);
    expect(skip, cue.name).toBeGreaterThanOrEqual(Math.max(0, start - VOICE.attack) - 1e-9);
    expect(skip + cue.length!, cue.name).toBeCloseTo(Math.min(take.seconds + tail, end + VOICE.release + tail), 9);
    expect(cue.src, cue.name).toContain(`dialogue/de/${processedFile(effect, take)}`);
  }
});

test("the scene's dialogue track plays each line's take alongside its subtitles", () => {
  expect(readFileSync("src/dialogue/DialogueTrack.tsx", "utf8")).toContain("voiceCues(lines");
  expect(readFileSync("src/scenes/klingelsturm/Klingelsturm.tsx", "utf8")).toContain("<DialogueTrack lines={LINES} inside={inTheFlur} />");
});

const LOCAL = existsSync("public/dialogue");

test.skipIf(!LOCAL)("the measured takes are exactly the recordings on disk (regenerate with node scripts/measure-takes.mjs)", () => {
  for (const lang of readdirSync("public/dialogue", { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name)) {
    const files = readdirSync(`public/dialogue/${lang}`).filter((f) => /\.(wav|mp3|ogg|flac)$/i.test(f)).sort();
    expect(Object.values((TAKES as Record<string, Record<string, { file: string }>>)[lang]).map((t) => t.file).sort(), lang).toEqual(files);
  }
});

const loudnessOf = (file: string) => Number(/I:\s*(-?[\d.]+) LUFS/.exec(spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", "ebur128", "-f", "null", "-"], { encoding: "utf8" }).stderr.split("Summary:")[1])![1]);

test("every line plays a copy of its take brought to its voice's loudness, in German and English alike: Karen shouting loudest, Tibik calmer, his inner voice and the phones a little lower again", { timeout: 120_000 }, () => {
  expect(VOICE_LOUDNESS.karen).toBeGreaterThan(VOICE_LOUDNESS.tibik);
  expect(VOICE_LOUDNESS.tibik).toBeGreaterThan(VOICE_LOUDNESS["tibik-inner"]);
  expect(VOICE_LOUDNESS["tibik-inner"]).toBeGreaterThanOrEqual(VOICE_LOUDNESS.leitstelle);
  const off: string[] = [];
  for (const [lang, line] of inEveryLanguage(ALL_SPOKEN_LINES)) {
    const take = takeOf(lang, takeIdOf(line)!);
    if (!take) continue;
    const file = `public/dialogue/${lang}/${processedFile(effectOf(line), take)}`;
    const target = VOICE_LOUDNESS[voiceOf(line)];
    const measured = loudnessOf(file);
    if (Math.abs(measured - target) > 1) off.push(`${file}: ${measured} LUFS, wants ${target}`);
  }
  expect(off).toEqual([]);
});

test.skipIf(!LOCAL)("every processed take exists and runs as long as its take plus its effect's tail (make them with node scripts/make-voices.mjs)", () => {
  for (const [lang, line] of inEveryLanguage(ALL_SPOKEN_LINES)) {
    const effect = effectOf(line);
    const take = takeOf(lang, takeIdOf(line)!);
    if (!take) continue;
    const file = `public/dialogue/${lang}/${processedFile(effect, take)}`;
    expect(existsSync(file), file).toBe(true);
    const seconds = Number(spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" }).stdout);
    expect(seconds, file).toBeCloseTo(take.seconds + (effect ? VOICE_EFFECTS[effect].tail : 0), 1);
  }
});

test("no voice runs into the next line: each take's speech ends before the next line in its scene starts (a hall's tail may ring on under it, as in a real hall)", () => {
  const into: string[] = [];
  for (const { lines } of SPOKEN) {
    const ordered = [...lines].sort((a, b) => a.from - b.from);
    ordered.slice(0, -1).forEach((line, i) => {
      const take = takeOf("de", takeIdOf(line)!);
      if (take?.speech.length !== 1) return;
      const ends = line.from + take.speech[0][1] - take.speech[0][0];
      if (ends > ordered[i + 1].from + 1e-9) into.push(`${takeIdOf(line)} by ${(ends - ordered[i + 1].from).toFixed(2)} s`);
    });
  }
  expect(into).toEqual([]);
});

test("each line's subtitle and moving mouth last as long as its take: none stops while the voice goes on", () => {
  const short = ALL_SPOKEN_LINES.flatMap((line) => {
    const take = takeOf("de", takeIdOf(line)!);
    if (take?.speech.length !== 1) return [];
    const ends = line.from + take.speech[0][1] - take.speech[0][0];
    return ends > line.to + 1e-9 ? [`${takeIdOf(line)} by ${(ends - line.to).toFixed(2)} s`] : [];
  });
  expect(short).toEqual([]);
});

const rmsAt = (file: string, from: number, seconds = 0.3) =>
  Number(/RMS level dB: (-?[\d.]+|-inf)/.exec(spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-ss", String(from), "-t", String(seconds), "-i", file, "-af", "astats=measure_overall=RMS_level:measure_perchannel=none", "-f", "null", "-"], { encoding: "utf8" }).stderr.split("Overall")[1] ?? "")?.[1] ?? "-inf");

test("his inner voice rings like a great hall: a tail of four seconds and more after a short gap, a few dB under his voice, still ringing after his words and gone by the end of its tail", () => {
  const { hall, tail } = VOICE_EFFECTS.inner;
  expect(hall.rt60).toBeGreaterThanOrEqual(4);
  expect(tail).toBeGreaterThanOrEqual(hall.rt60);
  expect(hall.predelay).toBeGreaterThanOrEqual(0.05);
  expect(hall.wet).toBeLessThanOrEqual(-3);
  for (const [lang, line] of inEveryLanguage(ALL_SPOKEN_LINES.filter((l) => effectOf(l) === "inner"))) {
    const take = takeOf(lang, takeIdOf(line)!)!;
    const file = `public/dialogue/${lang}/${processedFile("inner", take)}`;
    const ends = take.speech[0][1];
    expect(rmsAt(file, ends + 0.3), `${file} after his words`).toBeGreaterThan(-45);
    expect(rmsAt(file, take.seconds + tail - 0.3), `${file} at the end of its tail`).toBeLessThan(-55);
  }
});

test("his inner voice's hall stays well under his words (owner: a bit less reverb): 0.3 s after he stops it rings at least 12 dB under his speech, a second later at least 22 dB under", () => {
  for (const [lang, line] of inEveryLanguage(ALL_SPOKEN_LINES.filter((l) => effectOf(l) === "inner"))) {
    const take = takeOf(lang, takeIdOf(line)!)!;
    const file = `public/dialogue/${lang}/${processedFile("inner", take)}`;
    const [from, ends] = take.speech[0];
    const speech = rmsAt(file, from, ends - from);
    expect(rmsAt(file, ends + 0.3) - speech, `${file} just after his words`).toBeLessThanOrEqual(-12);
    expect(rmsAt(file, ends + 1.3) - speech, `${file} a second later`).toBeLessThanOrEqual(-22);
  }
});

test("Karen's voice on the landing rings in the stairwell like her blows and steps, and comes through his shut door while the camera is in his Flur, switching at the cuts", () => {
  const karenUpstairs = KLINGELSTURM_LINES.filter((line) => line.speaker === "karen");
  expect(karenUpstairs.length).toBeGreaterThan(5);
  expect(ALL_SPOKEN_LINES.filter((line) => effectOf(line) === "stairwell")).toEqual(expect.arrayContaining(karenUpstairs));
  expect(ALL_SPOKEN_LINES.filter((line) => effectOf(line) === "stairwell")).toHaveLength(karenUpstairs.length);
  expect(VOICE_EFFECTS.stairwell.inside).toBe("door");
  const halfway = (line: (typeof karenUpstairs)[number]) => (t: number) => inTheFlur(t) || t >= line.from + 0.5;
  for (const line of karenUpstairs) {
    expect(voiceCues([line], "de", inTheFlur).every((cue) => cue.src.includes("/stairwell/") !== inTheFlur(cue.at + cue.length! / 2)), line.name).toBe(true);
    const cues = voiceCues([line], "de", halfway(line));
    const mine = [...cues].sort((a, b) => a.at - b.at);
    expect(mine.length, line.name).toBeGreaterThan(1);
    const whole = voiceCues([line], "de")[0];
    expect(mine[0].at, line.name).toBeCloseTo(whole.at, 9);
    expect(mine.reduce((sum, cue) => sum + cue.length!, 0), line.name).toBeCloseTo(whole.length!, 9);
    mine.forEach((cue, i) => {
      if (i > 0) expect(cue.at, line.name).toBeCloseTo(mine[i - 1].at + mine[i - 1].length!, 9);
      expect(cue.skip! - whole.skip!, line.name).toBeCloseTo(cue.at - whole.at, 9);
      expect(cue.src.includes("/door/"), `${line.name} @${cue.at}`).toBe(halfway(line)(cue.at + cue.length! / 2));
    });
  }
});

test.skipIf(!LOCAL)("Karen's through-the-door takes are muffled and quieter than her stairwell ones", () => {
  for (const [lang, line] of inEveryLanguage(KLINGELSTURM_LINES.filter((l) => l.speaker === "karen"))) {
    const take = takeOf(lang, takeIdOf(line)!)!;
    const door = `public/dialogue/${lang}/${processedFile("door", take)}`;
    expect(existsSync(door), door).toBe(true);
    expect(loudnessOf(door), door).toBeCloseTo(VOICE_LOUDNESS.karen + VOICE_EFFECTS.door.level, 0);
  }
});

test("no line starts with a beep any more: the bubbles' pluck was a cue for silent speech bubbles, and the voices carry the lines now", () => {
  const beeping = sourceFiles("src").filter((file) => !file.endsWith(".test.ts") && readFileSync(file, "utf8").includes("bubbleCues"));
  expect(beeping).toEqual([]);
});

test("the phone voices come from her speakerphone into the stairwell: the telephone band first, then the stairwell at half her reverb, through the door in his Flur", () => {
  const { phone, stairwell } = VOICE_EFFECTS;
  expect(phone.room).toBe("stairwell");
  expect(phone.wet).toBeCloseTo(0.5 * stairwell.wet, 9);
  expect(phone.tail).toBe(stairwell.tail);
  expect(phone.inside).toBe("phone-door");
  expect(VOICE_EFFECTS["phone-door"].filter).toBe(phone.filter);
  expect(VOICE_EFFECTS["phone-door"].room).toBe("door");
  if (!LOCAL) return;
  for (const [lang, line] of inEveryLanguage(ALL_SPOKEN_LINES.filter((l) => effectOf(l) === "phone"))) {
    const take = takeOf(lang, takeIdOf(line)!)!;
    const file = `public/dialogue/${lang}/${processedFile("phone", take)}`;
    const [start, end] = take.speech[0];
    const after = rmsAt(file, end + 0.15);
    expect(after, `${file} rings after the call`).toBeGreaterThan(-65);
    expect(after, `${file} lightly`).toBeLessThan(rmsAt(file, (start + end) / 2) - 12);
  }
});

test("Tibik speaks into the stairwell only through the open door: his two lines in the gap ring in it, 'Ja bitte?' behind the shut door stays as recorded", () => {
  const tibik = KLINGELSTURM_LINES.filter((line) => line.speaker === "tibik");
  expect(tibik.map((line) => [line.text, effectOf(line) ?? null])).toEqual([
    ["Ja bitte?", null],
    ["Worum geht es denn?", "doorway"],
    ["Der Umwelt zuliebe nicht.", "doorway"],
  ]);
  expect(VOICE_EFFECTS.doorway.room).toBe("stairwell");
  expect(VOICE_EFFECTS.doorway.wet).toBeGreaterThan(VOICE_EFFECTS.phone.wet);
  expect(VOICE_EFFECTS.doorway.wet).toBeLessThan(VOICE_EFFECTS.stairwell.wet);
});

test("Karen's first EY! from down the street is near enough to hear clearly (owner): barely dulled and close to full level, its slapback off the facades kept", () => {
  const { far } = VOICE_EFFECTS;
  expect(Number(/lowpass=f=(\d+)/.exec(far.filter)![1])).toBeGreaterThanOrEqual(3500);
  expect(20 * Math.log10(far.volume)).toBeGreaterThan(-2);
  expect(far.filter).toContain("aecho=0.8:0.8:115|230:0.4|0.18");
});

const samplesOf = (file: string, rate = 8000) => {
  const raw = spawnSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", String(rate), "-f", "f32le", "-"], { maxBuffer: 1 << 26 }).stdout;
  return Float32Array.from({ length: raw.length / 4 }, (_, i) => raw.readFloatLE(i * 4));
};

const lagOf = (a: Float32Array, b: Float32Array, rate = 8000, most = 0.02) => {
  let best = -Infinity;
  let lag = 0;
  for (let shift = -Math.round(most * rate); shift <= Math.round(most * rate); shift++) {
    let dot = 0;
    for (let i = 0; i < a.length; i++) dot += a[i] * (b[i + shift] ?? 0);
    if (dot > best) [best, lag] = [dot, shift];
  }
  return lag / rate;
};

test.skipIf(!LOCAL)("a levelled take is not shifted against the recording: its speech starts where the take's does, within a millisecond", () => {
  for (const [lang, id] of inEveryLanguage(["hausmuell_02_tibik", "klingelsturm_04_tibik"])) {
    const take = takeOf(lang, id)!;
    const lag = lagOf(samplesOf(`public/dialogue/${lang}/${take.file}`), samplesOf(`public/dialogue/${lang}/${processedFile(id.endsWith("04_tibik") ? "doorway" : undefined, take)}`));
    expect(Math.abs(lag), id).toBeLessThanOrEqual(0.001);
  }
});

const envelopeOf = (samples: Float32Array, window = 40) => Float32Array.from({ length: samples.length - window }, (_, i) => {
  let sum = 0;
  for (let k = i; k < i + window; k++) sum += samples[k] ** 2;
  return Math.sqrt(sum / window);
});

test.skipIf(!LOCAL)("Karen's raised voice is not shifted against her recordings either: by its loudness, since a new pitch makes a new waveform, her speech starts where each take's does, within a millisecond over her takes and a few for any one, the raise smearing its onsets that much", { timeout: 120_000 }, () => {
  const lags = inEveryLanguage(ALL_SPOKEN_LINES.filter((line) => voiceOf(line) === "karen" && effectOf(line) === undefined)).map(([lang, line]) => {
    const take = takeOf(lang, takeIdOf(line)!)!;
    return lagOf(envelopeOf(samplesOf(`public/dialogue/${lang}/${take.file}`)), envelopeOf(samplesOf(`public/dialogue/${lang}/${processedFile(undefined, take)}`)));
  });
  expect(lags.length).toBeGreaterThanOrEqual(6);
  const median = [...lags].sort((a, b) => a - b)[Math.floor(lags.length / 2)];
  expect(Math.abs(median)).toBeLessThanOrEqual(0.001);
  for (const lag of lags) expect(Math.abs(lag)).toBeLessThanOrEqual(0.005);
});
