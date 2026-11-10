import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { TIMELINE_FPS } from "../frameRate";
import { RECORD_SCRATCH } from "../scenes/hausmuell/soundCues";
import { filmTimeOf } from "../scenes/treppenhaus/cameras";
import { SOUND_CUES } from "../scenes/treppenhaus/choreography";
import { HAUSMUELL_FROM } from "../timeline";
import { MAIN_STREET, musicPlacement, musicVolume } from "./music";
import { flacSeconds } from "./soundLength";

test("the main-street music starts as he opens the Haustür and stops dead on the record scratch as Karen bursts in", () => {
  expect(MAIN_STREET.from).toBeCloseTo(filmTimeOf(SOUND_CUES.haustuerOpens)!, 9);
  expect(MAIN_STREET.to).toBeCloseTo(HAUSMUELL_FROM + RECORD_SCRATCH, 9);
  expect(musicVolume(MAIN_STREET, MAIN_STREET.from - 0.05)).toBe(0);
  expect(musicVolume(MAIN_STREET, MAIN_STREET.from + MAIN_STREET.fadeIn / 2)).toBeGreaterThan(0);
  expect(musicVolume(MAIN_STREET, MAIN_STREET.from + MAIN_STREET.fadeIn / 2)).toBeLessThan(MAIN_STREET.volume);
  expect(musicVolume(MAIN_STREET, (MAIN_STREET.from + MAIN_STREET.to) / 2)).toBe(MAIN_STREET.volume);
  expect(musicVolume(MAIN_STREET, MAIN_STREET.to - 2 / TIMELINE_FPS)).toBe(MAIN_STREET.volume);
  expect(musicVolume(MAIN_STREET, MAIN_STREET.to)).toBe(0);
  expect(musicVolume(MAIN_STREET, MAIN_STREET.to + 1)).toBe(0);
});

test("the recording is long enough for the stretch it plays under", () => {
  expect(flacSeconds(readFileSync(`public/${MAIN_STREET.file}`))).toBeGreaterThan(MAIN_STREET.to - MAIN_STREET.from);
});

test("each composition plays the part of the music that falls inside it, so a scene previewed alone sounds as it does in the film", () => {
  const film = musicPlacement(MAIN_STREET, 0, TIMELINE_FPS)!;
  expect(film.from).toBe(Math.round(MAIN_STREET.from * TIMELINE_FPS));
  expect(film.trimBefore).toBe(0);
  const inside = musicPlacement(MAIN_STREET, HAUSMUELL_FROM, TIMELINE_FPS)!;
  expect(inside.from).toBe(0);
  expect(inside.trimBefore).toBe(Math.round((HAUSMUELL_FROM - MAIN_STREET.from) * TIMELINE_FPS));
  expect(inside.start).toBeCloseTo(HAUSMUELL_FROM, 9);
  expect(musicPlacement(MAIN_STREET, MAIN_STREET.to + 0.5, TIMELINE_FPS)).toBeNull();
});
