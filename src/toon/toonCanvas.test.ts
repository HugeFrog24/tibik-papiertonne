import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "vitest";
import { FINEST_PIXEL_RATIO } from "../frameRate";

test("the 3D canvas draws at the render's own pixel density up to 8K: React Three Fiber would stop at twice 1080p and leave an 8K or 16K render a 4K picture blown up; past 8K it stays at 8K, since the browser quietly halves a larger WebGL canvas behind three.js's back", () => {
  expect(FINEST_PIXEL_RATIO).toBe(4);
  expect(readFileSync(path.join(__dirname, "ToonCanvas.tsx"), "utf8")).toMatch(/dpr=\{\[1, FINEST_PIXEL_RATIO\]\}/);
});

test("the ink pass sizes its buffers within the largest texture the GPU takes", () => {
  const calls = readFileSync(path.join(__dirname, "InkPass.tsx"), "utf8").match(/canvasPixels\(.*\);/g) ?? [];
  expect(calls).toHaveLength(2);
  for (const call of calls) expect(call).toMatch(/gl\.capabilities\.maxTextureSize\);$/);
});

test("the ink pass draws a shot into a multisampled buffer only where colourSamples allows it", () => {
  const pass = readFileSync(path.join(__dirname, "InkPass.tsx"), "utf8");
  expect(pass).toMatch(/colourSamples\(pixels\)/);
  expect(pass).not.toMatch(/samples: 4\b/);
});
