import { spawnSync } from "node:child_process";
import process from "node:process";

const extra = process.argv.slice(2);
const CRASH = /Worker exited unexpectedly with exit code \d+ during \w+ state while running test file (\S+)/g;

const run = (files) => {
  const result = spawnSync("npx", ["vitest", "run", "--no-file-parallelism", ...extra, ...files], {
    encoding: "utf8",
    shell: true,
    maxBuffer: 64 * 1024 * 1024,
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  process.stdout.write(output);
  const crashed = [...new Set([...output.matchAll(CRASH)].map((m) => m[1]))];
  const failed = /Test Files\s+\d+ failed/.test(output) || /Tests\s+\d+ failed/.test(output);
  return { crashed, failed, status: result.status ?? 1 };
};

let { crashed, failed, status } = run([]);
for (let attempt = 1; attempt <= 2 && !failed && crashed.length > 0; attempt++) {
  process.stdout.write(`\nRe-running ${crashed.length} test file(s) lost to a crashed worker (attempt ${attempt}):\n${crashed.join("\n")}\n`);
  ({ crashed, failed, status } = run(crashed));
}
process.exit(failed || crashed.length > 0 ? 1 : status);
