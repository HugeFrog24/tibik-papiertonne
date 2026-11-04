import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import process from "node:process";
import { failedFiles as failedInReport, lostFiles, mergeReports } from "./merge-reports.mjs";

const extra = process.argv.slice(2);
const CRASH = /Worker exited unexpectedly with exit code \d+ during \w+ state while running test file (\S+)/g;
const FAILED_FILE = /FAIL\s+(\S+\.test\.tsx?)/g;
const WORKER_ERROR = /Worker forks emitted error/;
const norm = (file) => file.replace(/\\/g, "/").replace(/^.*?(src\/)/, "$1");

const OUTPUT = /^--outputFile=(.+\.json)$/;
const report = extra.map((arg) => arg.match(OUTPUT)?.[1]).find(Boolean);
const rerunReports = [];

const run = (files, attempt = 0) => {
  const args = attempt === 0 || !report ? extra : extra.map((arg) => (OUTPUT.test(arg) ? `--outputFile=${report}.rerun${attempt}.json` : arg));
  if (attempt > 0 && report) rerunReports.push(`${report}.rerun${attempt}.json`);
  const written = attempt === 0 ? report : `${report}.rerun${attempt}.json`;
  if (report) rmSync(written, { force: true });
  const result = spawnSync("npx", ["vitest", "run", "--no-file-parallelism", ...args, ...files], {
    encoding: "utf8",
    shell: true,
    maxBuffer: 64 * 1024 * 1024,
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  process.stdout.write(output);
  const failedFiles = [...new Set([...output.matchAll(FAILED_FILE)].map((m) => norm(m[1])))];
  const workerBroke = WORKER_ERROR.test(output);
  const json = report && existsSync(written) ? JSON.parse(readFileSync(written, "utf8")) : null;
  const lost = json ? lostFiles(json) : [];
  const crashed = [
    ...new Map(
      [...[...output.matchAll(CRASH)].map((m) => m[1]), ...(workerBroke ? failedFiles : []), ...lost].map((file) => [norm(file), file]),
    ).values(),
  ];
  const crashedNames = new Set(crashed.map(norm));
  const failed = [...failedFiles, ...(json ? failedInReport(json) : [])].some((file) => !crashedNames.has(norm(file)));
  return { crashed, failed, status: result.status ?? 1 };
};

let { crashed, failed, status } = run([]);
for (let attempt = 1; attempt <= 4 && !failed && crashed.length > 0; attempt++) {
  process.stdout.write(`\nRe-running ${crashed.length} test file(s) lost to a crashed worker (attempt ${attempt}):\n${crashed.join("\n")}\n`);
  ({ crashed, failed, status } = run(crashed, attempt));
}
const written = rerunReports.filter((file) => existsSync(file));
if (report && existsSync(report)) {
  const read = (file) => JSON.parse(readFileSync(file, "utf8"));
  const merged = mergeReports(read(report), written.map(read));
  writeFileSync(report, JSON.stringify(merged));
  for (const file of written) rmSync(file);
  if (written.length > 0) process.stdout.write(`\nMerged ${written.length} rerun report(s) into ${report}\n`);
  process.exit(merged.success && !failed && crashed.length === 0 ? 0 : 1);
}
process.exit(failed || crashed.length > 0 ? 1 : status);
