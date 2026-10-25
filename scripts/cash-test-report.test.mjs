import assert from 'node:assert/strict';
import { test } from 'node:test';

import { assertCashTestReport } from './cash-test-report.mjs';

const files = ['one.spec.ts', 'two.spec.ts'];
const passing = () => ({
  success: true,
  numFailedTests: 0,
  numPendingTests: 0,
  numTotalTests: 2,
  numPendingTestSuites: 0,
  testResults: files.map((name) => ({
    name,
    status: 'passed',
    assertionResults: [{ status: 'passed' }]
  }))
});
test('accepts a real passing result with every expected suite', () =>
  assert.doesNotThrow(() => assertCashTestReport(passing(), files)));
test('rejects an all-skipped green Jest exit', () =>
  assert.throws(() =>
    assertCashTestReport(
      { ...passing(), numPendingTests: 2, numTotalTests: 2 },
      files
    )
  ));
test('rejects a missing PostgreSQL suite', () => {
  const r = passing();
  r.testResults.pop();
  assert.throws(() => assertCashTestReport(r, files));
});
test('rejects a skipped assertion even if the summary says success', () => {
  const r = passing();
  r.testResults[0].assertionResults[0].status = 'pending';
  assert.throws(() => assertCashTestReport(r, files));
});

test('accepts Windows paths for every expected suite', () => {
  const r = passing();
  r.testResults = r.testResults.map((suite) => ({
    ...suite,
    name: ['C:', 'repo', suite.name].join(String.fromCharCode(92))
  }));
  assert.doesNotThrow(() => assertCashTestReport(r, files));
});
