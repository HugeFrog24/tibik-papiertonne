import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { RENDER_RATES, TIMELINE_FPS, renderFrame } from "./frameRate";
import { BY_DEFAULT, RENDER_PROPS, atRenderRate } from "./renderRate";
import { LANGUAGES } from "./language";
import TAKES from "./dialogue/takes.json";
import { FILM_FRAMES, SCENES, wholeFrames } from "./timeline";

test("the film renders at 30, 60, 90 or 120 fps, each a whole multiple of the 30 fps its timeline is cut and timed on, and at no other rate", () => {
  expect(RENDER_RATES).toEqual([30, 60, 90, 120]);
  for (const fps of RENDER_RATES) expect(RENDER_PROPS.safeParse({ fps, language: "de" }).success, `${fps} fps`).toBe(true);
  for (const fps of [0, 24, 25, 29.97, 45, 50, 59.94, 150, 240]) expect(RENDER_PROPS.safeParse({ fps, language: "de" }).success, `${fps} fps`).toBe(false);
  expect(BY_DEFAULT.fps).toBe(TIMELINE_FPS);
});

test("the film and every scene come in German, as filmed, or in English, picked from a Studio dropdown, and in no other language", () => {
  expect(LANGUAGES).toEqual(["de", "en"]);
  expect([...LANGUAGES].sort()).toEqual(Object.keys(TAKES).sort());
  for (const language of LANGUAGES) expect(RENDER_PROPS.safeParse({ fps: TIMELINE_FPS, language }).success, language).toBe(true);
  for (const language of ["fr", "EN", "", "deutsch"]) expect(RENDER_PROPS.safeParse({ fps: TIMELINE_FPS, language }).success, language).toBe(false);
  expect(RENDER_PROPS.safeParse({ fps: TIMELINE_FPS }).success).toBe(false);
  expect(BY_DEFAULT).toEqual({ fps: TIMELINE_FPS, language: "de" });
});

test("at every render rate the film and each of its scenes run exactly as long as at 30 fps", () => {
  for (const fps of RENDER_RATES) {
    const k = fps / TIMELINE_FPS;
    expect(atRenderRate(() => FILM_FRAMES)({ props: { fps, language: "de" } })).toEqual({ fps, durationInFrames: FILM_FRAMES * k });
    for (const scene of SCENES) expect(atRenderRate(() => wholeFrames(scene))({ props: { fps, language: "de" } }), scene.name).toEqual({ fps, durationInFrames: wholeFrames(scene) * k });
  }
});

const MOMENTS = Array.from({ length: 4000 }, (_, i) => (i * 0.0537231) % 216);

test("a moment on the timeline starts on the same instant at every render rate: the tick of the 30 fps grid nearest to it", () => {
  for (const t of MOMENTS) {
    const tick = Math.round(t * TIMELINE_FPS) / TIMELINE_FPS;
    for (const fps of RENDER_RATES) {
      const frame = renderFrame(t, fps);
      expect(Number.isInteger(frame), `${t} s at ${fps} fps`).toBe(true);
      expect(Math.abs(frame / fps - tick), `${t} s at ${fps} fps`).toBeLessThan(1e-9);
    }
  }
});

test("the film and every scene take their render rate and language as props the Studio can step through, 30 fps in German unless set otherwise, and hand the language to everything inside", () => {
  const root = readFileSync(path.join(__dirname, "Root.tsx"), "utf8");
  expect(root.match(/calculateMetadata=\{atRenderRate\(/g)).toHaveLength(2);
  expect(root.match(/schema=\{RENDER_PROPS\}/g)).toHaveLength(2);
  expect(root.match(/defaultProps=\{BY_DEFAULT\}/g)).toHaveLength(2);
  expect(root).toContain("component={inLanguage(SCENE_COMPONENTS[scene.name])}");
  expect(readFileSync(path.join(__dirname, "Film.tsx"), "utf8")).toContain("<LanguageContext.Provider value={language}>");
});

test("no component turns seconds into frames by itself: every sound and sequence is placed through renderFrame, so it lands where it does at 30 fps", () => {
  const components = readdirSync(__dirname, { recursive: true, encoding: "utf8" }).filter((file) => file.endsWith(".tsx"));
  expect(components.length).toBeGreaterThan(20);
  for (const file of components) expect(readFileSync(path.join(__dirname, file), "utf8"), file).not.toMatch(/[*]\s*(fps|TIMELINE_FPS)\b|\b(fps|TIMELINE_FPS)\s*[*]/);
});
