import { expect, test } from "vitest";
import {
  failedFiles,
  lostFiles,
  mergeReports,
} from "../../scripts/merge-reports.mjs";

const result = (name: string, statuses: string[]) => ({
  name,
  status: statuses.includes("failed") ? "failed" : "passed",
  assertionResults: statuses.map((status, i) => ({
    title: `${name} ${i}`,
    status,
    duration: 10 * (i + 1),
  })),
});

test("a rerun's results replace the crashed files' entries and the totals are recounted", () => {
  const main = {
    numTotalTests: 3,
    numPassedTests: 1,
    numFailedTests: 2,
    success: false,
    testResults: [
      result("C:/repo/src/a.test.ts", ["passed"]),
      result("C:/repo/src/b.test.ts", ["failed", "failed"]),
    ],
  };
  const rerun = {
    testResults: [
      result(String.raw`C:\repo\src\b.test.ts`, ["passed", "passed"]),
    ],
  };
  const merged = mergeReports(main, [rerun]);
  expect(merged.testResults).toHaveLength(2);
  expect(merged.numTotalTests).toBe(3);
  expect(merged.numPassedTests).toBe(3);
  expect(merged.numFailedTests).toBe(0);
  expect(merged.success).toBe(true);
  expect(
    merged.testResults.flatMap(
      (r: { assertionResults: { duration: number }[] }) =>
        r.assertionResults.map((a) => a.duration),
    ),
  ).toEqual([10, 10, 20]);
});

test("a file whose tests never ran was lost to a crashed worker, even when the JSON reporter hides the crash", () => {
  const report = {
    testResults: [
      result("C:/repo/src/a.test.ts", ["passed"]),
      result(String.raw`C:\repo\src\characters\gait.test.ts`, [
        "passed",
        "pending",
        "pending",
      ]),
    ],
  };
  expect(lostFiles(report)).toEqual(["src/characters/gait.test.ts"]);
});

test("a merged report with tests that never ran is not a success", () => {
  const main = {
    success: true,
    testResults: [result("C:/repo/src/a.test.ts", ["passed", "pending"])],
  };
  expect(mergeReports(main, []).success).toBe(false);
});

test("tests skipped on purpose (test.skip, todo, a -t filter) were not lost to a crash; only tests left pending were", () => {
  const report = {
    testResults: [
      result("C:/repo/src/a.test.ts", ["passed", "skipped", "todo"]),
      result("C:/repo/src/b.test.ts", ["passed", "pending"]),
    ],
  };
  expect(lostFiles(report)).toEqual(["src/b.test.ts"]);
});

test("a file that failed to import has no test results, but it fails the run", () => {
  const broken = {
    name: "C:/repo/src/b.test.ts",
    status: "failed",
    assertionResults: [],
  };
  const report = {
    testResults: [result("C:/repo/src/a.test.ts", ["passed"]), broken],
  };
  expect(failedFiles(report)).toEqual(["src/b.test.ts"]);
  expect(mergeReports({ success: true, ...report }, []).success).toBe(false);
});
