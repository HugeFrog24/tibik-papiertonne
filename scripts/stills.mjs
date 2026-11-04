import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import { mkdirSync } from "node:fs";
import path from "node:path";

const [id, outDir, ...frames] = process.argv.slice(2);
if (!id || !outDir || frames.length === 0) {
  throw new Error("usage: node scripts/stills.mjs <composition> <out dir> <frame>...");
}
mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), rspack: true });
const chromiumOptions = { gl: "angle" };
const browser = await openBrowser("chrome", { chromiumOptions });
const composition = await selectComposition({ serveUrl, id, puppeteerInstance: browser, chromiumOptions });
for (const frame of frames.map(Number)) {
  const output = path.join(outDir, `${id}-${String(frame).padStart(4, "0")}.png`);
  await renderStill({ composition, serveUrl, frame, output, puppeteerInstance: browser, chromiumOptions });
  process.stdout.write(`${output}\n`);
}
await browser.close({ silent: true });
