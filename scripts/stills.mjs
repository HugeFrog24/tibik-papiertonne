import { bundle } from "@remotion/bundler";
import { openBrowser, renderStill, selectComposition } from "@remotion/renderer";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { parseStillsArgs } from "./stillsArgs.mjs";

const { outDir, jobs } = parseStillsArgs(process.argv.slice(2));
mkdirSync(outDir, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), rspack: true });
const chromiumOptions = { gl: "angle" };
const browser = await openBrowser("chrome", { chromiumOptions });
for (const { id, frames } of jobs) {
  const composition = await selectComposition({ serveUrl, id, puppeteerInstance: browser, chromiumOptions });
  for (const frame of frames) {
    const output = path.join(outDir, `${id}-${String(frame).padStart(4, "0")}.png`);
    await renderStill({ composition, serveUrl, frame, output, puppeteerInstance: browser, chromiumOptions });
    process.stdout.write(`${output}\n`);
  }
}
await browser.close({ silent: true });
