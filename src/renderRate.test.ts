import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { RENDER_RATES, TIMELINE_FPS, renderFrame } from "./frameRate";
import { AT_THE_TIMELINE_RATE, RENDER_RATE, atRenderRate } from "./renderRate";
import { FILM_FRAMES, SCENES, wholeFrames } from "./timeline";

test("the film renders at 30, 60, 90 or 120 fps, each a whole multiple of the 30 fps its timeline is cut and timed on, and at no other rate", () => {
  expect(RENDER_RATES).toEqual([30, 60, 90, 120]);
  for (const fps of RENDER_RATES) expect(RENDER_RATE.safeParse({ fps }).success, `${fps} fps`).toBe(true);
  for (const fps of [0, 24, 25, 29.97, 45, 50, 59.94, 150, 240]) expect(RENDER_RATE.safeParse({ fps }).success, `${fps} fps`).toBe(false);
  expect(AT_THE_TIMELINE_RATE).toEqual({ fps: TIMELINE_FPS });
});

test("at every render rate the film and each of its scenes run exactly as long as at 30 fps", () => {
  for (const fps of RENDER_RATES) {
    const k = fps / TIMELINE_FPS;
    expect(atRenderRate(FILM_FRAMES)({ props: { fps } })).toEqual({ fps, durationInFrames: FILM_FRAMES * k });
    for (const scene of SCENES) expect(atRenderRate(wholeFrames(scene))({ props: { fps } }), scene.name).toEqual({ fps, durationInFrames: wholeFrames(scene) * k });
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

test("the film and every scene take their render rate as a prop the Studio can step through, 30 fps unless set otherwise", () => {
  const root = readFileSync(path.join(__dirname, "Root.tsx"), "utf8");
  expect(root.match(/calculateMetadata=\{atRenderRate\(/g)).toHaveLength(2);
  expect(root.match(/schema=\{RENDER_RATE\}/g)).toHaveLength(2);
  expect(root.match(/defaultProps=\{AT_THE_TIMELINE_RATE\}/g)).toHaveLength(2);
});

test("no component turns seconds into frames by itself: every sound and sequence is placed through renderFrame, so it lands where it does at 30 fps", () => {
  const components = readdirSync(__dirname, { recursive: true, encoding: "utf8" }).filter((file) => file.endsWith(".tsx"));
  expect(components.length).toBeGreaterThan(20);
  for (const file of components) expect(readFileSync(path.join(__dirname, file), "utf8"), file).not.toMatch(/[*]\s*(fps|TIMELINE_FPS)\b|\b(fps|TIMELINE_FPS)\s*[*]/);
});
