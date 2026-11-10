const key = (name) => name.replaceAll("\\", "/").replace(/^.*?(src\/)/, "$1");

export const lostFiles = (report) =>
  report.testResults
    .filter((r) => r.assertionResults.some((t) => t.status === "pending"))
    .map((r) => key(r.name));

export const failedFiles = (report) =>
  report.testResults
    .filter(
      (r) =>
        r.status === "failed" ||
        r.assertionResults.some((t) => t.status === "failed"),
    )
    .map((r) => key(r.name));

export const mergeReports = (main, reruns) => {
  const byFile = new Map(main.testResults.map((r) => [key(r.name), r]));
  for (const rerun of reruns)
    for (const r of rerun.testResults) byFile.set(key(r.name), r);
  const testResults = [...byFile.values()];
  const tests = testResults.flatMap((r) => r.assertionResults);
  const count = (status) => tests.filter((t) => t.status === status).length;
  return {
    ...main,
    testResults,
    numTotalTests: tests.length,
    numPassedTests: count("passed"),
    numFailedTests: count("failed"),
    numPendingTests: count("pending") + count("skipped"),
    numTodoTests: count("todo"),
    numTotalTestSuites: testResults.length,
    numPassedTestSuites: testResults.filter((r) => r.status === "passed")
      .length,
    numFailedTestSuites: testResults.filter((r) => r.status === "failed")
      .length,
    success:
      failedFiles({ testResults }).length === 0 &&
      lostFiles({ testResults }).length === 0,
  };
};
