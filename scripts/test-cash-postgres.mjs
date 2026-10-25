import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { assertCashTestReport } from './cash-test-report.mjs';

const files = [
  'apps/api/src/app/account-balance/cash-management.integration.spec.ts',
  'apps/api/src/services/import/portfolio-restore.integration.spec.ts',
  'apps/api/src/app/portfolio/calculator/roai/portfolio-calculator-cash-ledger-contract.spec.ts'
];
let temporary;
try {
  if (!process.env.CASH_TEST_DATABASE_URL)
    throw new Error(
      'CASH_TEST_DATABASE_URL is mandatory; skipping PostgreSQL is not a passing run.'
    );
  const url = new URL(process.env.CASH_TEST_DATABASE_URL);
  if (!url.pathname.startsWith('/cash_test_'))
    throw new Error('A disposable cash_test_ database is required.');
  const timezone = process.env.TEST_TZ ?? 'UTC';
  if (!['UTC', 'Europe/Rome'].includes(timezone))
    throw new Error('Use UTC or Europe/Rome for Cash validation.');
  temporary = mkdtempSync(join(tmpdir(), 'ghostfolio-cash-results-'));
  const report = join(temporary, 'jest.json');
  const child = spawnSync(
    process.execPath,
    [
      '-r',
      'dotenv/config',
      'node_modules/jest/bin/jest.js',
      '--config',
      'apps/api/jest.config.ts',
      '--runInBand',
      '--no-cache',
      '--testTimeout=15000',
      '--json',
      '--outputFile',
      report,
      '--runTestsByPath',
      ...files
    ],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: url.toString(),
        DIRECT_URL: url.toString(),
        CASH_TEST_DATABASE_URL: url.toString(),
        TZ: timezone,
        TEST_TZ: timezone,
        DOTENV_CONFIG_PATH: '.env.example'
      }
    }
  );
  if (child.error || child.status !== 0)
    throw new Error('Cash test process failed.');
  assertCashTestReport(JSON.parse(readFileSync(report, 'utf8')), files);
  console.log(
    `Cash gate passed: all three suites ran without skips (${timezone}).`
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (temporary) rmSync(temporary, { recursive: true, force: true });
}
