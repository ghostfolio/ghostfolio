export function assertCashTestReport(report, expectedFiles) {
  if (
    report.success !== true ||
    report.numFailedTests !== 0 ||
    report.numPendingTests !== 0 ||
    report.numTotalTests < 1 ||
    report.numPendingTestSuites > 0
  ) {
    throw new Error('Cash suites must pass with no skipped tests.');
  }
  const results = report.testResults ?? [];
  if (results.length !== expectedFiles.length)
    throw new Error('Missing Cash test suites.');
  for (const file of expectedFiles) {
    const suite = results.find(({ name }) =>
      name.replaceAll('\\', '/').endsWith(file)
    );
    if (
      !suite ||
      suite.status !== 'passed' ||
      !suite.assertionResults?.length ||
      suite.assertionResults.some(({ status }) => status !== 'passed')
    ) {
      throw new Error(`Cash suite was missing, skipped or failed: ${file}`);
    }
  }
}
