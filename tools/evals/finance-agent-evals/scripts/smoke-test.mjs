import {
  FINANCE_AGENT_EVAL_DATASET,
  getFinanceAgentEvalCategoryCounts,
  runFinanceAgentEvalSuite
} from '../index.mjs';

async function main() {
  const summary = getFinanceAgentEvalCategoryCounts(FINANCE_AGENT_EVAL_DATASET);

  if (FINANCE_AGENT_EVAL_DATASET.length < 50) {
    throw new Error('Dataset must contain at least 50 cases');
  }

  if (summary.happy_path < 20) {
    throw new Error('happy_path category must contain at least 20 cases');
  }

  if (summary.edge_case < 10) {
    throw new Error('edge_case category must contain at least 10 cases');
  }

  if (summary.adversarial < 10) {
    throw new Error('adversarial category must contain at least 10 cases');
  }

  if (summary.multi_step < 10) {
    throw new Error('multi_step category must contain at least 10 cases');
  }

  const result = await runFinanceAgentEvalSuite({
    cases: FINANCE_AGENT_EVAL_DATASET.slice(0, 2),
    execute: async (evalCase) => {
      const minCitations = evalCase.expected.minCitations ?? 0;

      return {
        answer: [
          `Smoke response for ${evalCase.id}`,
          ...(evalCase.expected.answerIncludes ?? [])
        ].join(' '),
        citations: Array.from({ length: minCitations }).map(() => {
          return {
            source: 'smoke',
            snippet: 'synthetic citation'
          };
        }),
        confidence: { score: 1 },
        memory: { turns: 1 },
        toolCalls: (evalCase.expected.requiredTools ?? []).map((tool) => {
          return {
            status: 'success',
            tool
          };
        }),
        verification: (evalCase.expected.verificationChecks ?? []).map(
          ({ check, status }) => {
            return {
              check,
              status: status ?? 'passed'
            };
          }
        )
      };
    }
  });

  if (result.total !== 2) {
    throw new Error('Runner smoke test did not execute expected cases');
  }

  console.log(
    JSON.stringify({
      categories: summary,
      passRate: result.passRate,
      total: FINANCE_AGENT_EVAL_DATASET.length
    })
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
