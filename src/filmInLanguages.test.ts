import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { TIMELINE_FPS } from "./frameRate";
import { FILM_FRAMES, FILM_SCENES, SCENES, filmAmbienceIn, filmFramesIn, filmStartsIn, FILM_AMBIENCE } from "./timeline";
import { KLINGELSTURM_CLOCKS } from "./scenes/klingelsturm/hold";
import { atRenderRate } from "./renderRate";

const HELD = KLINGELSTURM_CLOCKS.en.frames;

test("the German film is the film as it was: its scenes, their lengths and its length unchanged", () => {
  expect(FILM_SCENES.de).toBe(SCENES);
  expect(filmFramesIn("de")).toBe(FILM_FRAMES);
});

test("the English film is the German one with Klingelsturm 37 frames longer: the scenes before it start as in German, the ones after it 37 frames later", () => {
  expect(HELD).toBe(37);
  expect(filmFramesIn("en")).toBe(FILM_FRAMES + HELD);
  const [de, en] = [filmStartsIn("de"), filmStartsIn("en")];
  const klingelsturm = SCENES.findIndex((scene) => scene.name === "Klingelsturm");
  SCENES.forEach((scene, i) => {
    expect(FILM_SCENES.en[i].name).toBe(scene.name);
    expect(FILM_SCENES.en[i].frames - scene.frames, scene.name).toBe(i === klingelsturm ? HELD : 0);
    expect(en[i] - de[i], scene.name).toBe(i > klingelsturm ? HELD : 0);
  });
  expect(atRenderRate(filmFramesIn)({ props: { fps: 60, language: "en" } }).durationInFrames).toBe((FILM_FRAMES + HELD) * 2);
});

test("the film's own ambience follows each language's scenes: in English, every moment after Klingelsturm sounds as it does 37 frames earlier in German", () => {
  const english = filmAmbienceIn("en");
  const after = filmStartsIn("de")[SCENES.findIndex((scene) => scene.name === "Nachtruhe")] / TIMELINE_FPS;
  for (const t of [0, 1, after + 1, after + 7.3, after + 30, FILM_FRAMES / TIMELINE_FPS - 2]) {
    const moved = t >= after ? t + HELD / TIMELINE_FPS : t;
    for (const pick of ["indoors", "hush"] as const) expect(english[pick](moved), `${pick} at ${t}`).toBeCloseTo(FILM_AMBIENCE[pick](t), 9);
  }
});

test("the Film composition takes its length and scenes from its language", () => {
  const root = readFileSync("src/Root.tsx", "utf8");
  expect(root).toContain("calculateMetadata={atRenderRate(filmFramesIn)}");
  const film = readFileSync("src/Film.tsx", "utf8");
  expect(film).toContain("FILM_SCENES[language]");
  expect(film).toContain("filmAmbienceIn(language)");
});
