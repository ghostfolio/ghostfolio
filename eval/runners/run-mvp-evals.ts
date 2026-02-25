import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface EvalTestCase {
  expectedOutputContains: string[];
  expectedToolCalls: string[];
  id: string;
  inputQuery: string;
  passCriteria: string;
}

function run() {
  const filePath = resolve(process.cwd(), 'eval/datasets/mvp-tests.json');
  const payload = readFileSync(filePath, 'utf-8');
  const tests = JSON.parse(payload) as EvalTestCase[];

  const results = tests.map((testCase) => {
    return {
      expectedTools: testCase.expectedToolCalls.length,
      id: testCase.id,
      passCriteria: testCase.passCriteria,
      query: testCase.inputQuery,
      status: 'TODO_RUN_AGAINST_API'
    };
  });

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      total: results.length,
      todo: results.filter((result) => result.status === 'TODO_RUN_AGAINST_API')
        .length
    },
    tests: results
  };

  // Minimal runner for MVP baseline visibility.
  console.log(JSON.stringify(report, null, 2));
}

run();
