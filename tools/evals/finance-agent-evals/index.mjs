import dataset from './datasets/ghostfolio-finance-agent-evals.v1.json' with {
  type: 'json'
};

export const FINANCE_AGENT_EVAL_DATASET = dataset;
export const FINANCE_AGENT_EVAL_CATEGORIES = [
  'happy_path',
  'edge_case',
  'adversarial',
  'multi_step'
];

function hasExpectedVerification({
  actualChecks,
  expectedCheck
}) {
  return (actualChecks ?? []).some(({ check, status }) => {
    if (check !== expectedCheck.check) {
      return false;
    }

    if (!expectedCheck.status) {
      return true;
    }

    return status === expectedCheck.status;
  });
}

export function evaluateFinanceAgentResponse({
  evalCase,
  response
}) {
  const failures = [];
  const observedTools = (response.toolCalls ?? []).map(({ tool }) => tool);

  for (const requiredTool of evalCase.expected.requiredTools ?? []) {
    if (!observedTools.includes(requiredTool)) {
      failures.push(`Missing required tool: ${requiredTool}`);
    }
  }

  for (const forbiddenTool of evalCase.expected.forbiddenTools ?? []) {
    if (observedTools.includes(forbiddenTool)) {
      failures.push(`Forbidden tool executed: ${forbiddenTool}`);
    }
  }

  for (const expectedCall of evalCase.expected.requiredToolCalls ?? []) {
    const matched = (response.toolCalls ?? []).some((toolCall) => {
      return (
        toolCall.tool === expectedCall.tool &&
        (!expectedCall.status || toolCall.status === expectedCall.status)
      );
    });

    if (!matched) {
      failures.push(
        `Missing required tool call: ${expectedCall.tool}${expectedCall.status ? `:${expectedCall.status}` : ''}`
      );
    }
  }

  if (
    typeof evalCase.expected.minCitations === 'number' &&
    (response.citations ?? []).length < evalCase.expected.minCitations
  ) {
    failures.push(
      `Expected at least ${evalCase.expected.minCitations} citation(s), got ${(response.citations ?? []).length}`
    );
  }

  if (
    typeof evalCase.expected.memoryTurnsAtLeast === 'number' &&
    (response.memory?.turns ?? 0) < evalCase.expected.memoryTurnsAtLeast
  ) {
    failures.push(
      `Expected memory turns >= ${evalCase.expected.memoryTurnsAtLeast}, got ${response.memory?.turns ?? 0}`
    );
  }

  if (
    typeof evalCase.expected.confidenceScoreMin === 'number' &&
    (response.confidence?.score ?? 0) < evalCase.expected.confidenceScoreMin
  ) {
    failures.push(
      `Expected confidence score >= ${evalCase.expected.confidenceScoreMin}, got ${response.confidence?.score ?? 0}`
    );
  }

  for (const expectedText of evalCase.expected.answerIncludes ?? []) {
    if (!String(response.answer ?? '').includes(expectedText)) {
      failures.push(`Answer does not include expected text: "${expectedText}"`);
    }
  }

  for (const expectedVerification of evalCase.expected.verificationChecks ?? []) {
    if (
      !hasExpectedVerification({
        actualChecks: response.verification ?? [],
        expectedCheck: expectedVerification
      })
    ) {
      failures.push(
        `Missing verification check: ${expectedVerification.check}${expectedVerification.status ? `:${expectedVerification.status}` : ''}`
      );
    }
  }

  return failures;
}

export function summarizeFinanceAgentEvalByCategory({
  cases,
  results
}) {
  const passedById = new Map(
    results.map(({ id, passed }) => {
      return [id, passed];
    })
  );
  const categoryStats = new Map(
    FINANCE_AGENT_EVAL_CATEGORIES.map((category) => {
      return [category, { passed: 0, total: 0 }];
    })
  );

  for (const evalCase of cases) {
    const stats = categoryStats.get(evalCase.category);

    if (!stats) {
      continue;
    }

    stats.total += 1;

    if (passedById.get(evalCase.id)) {
      stats.passed += 1;
    }
  }

  return FINANCE_AGENT_EVAL_CATEGORIES.map((category) => {
    const { passed, total } = categoryStats.get(category) ?? {
      passed: 0,
      total: 0
    };

    return {
      category,
      passRate: total > 0 ? passed / total : 0,
      passed,
      total
    };
  });
}

export async function runFinanceAgentEvalSuite({
  cases = FINANCE_AGENT_EVAL_DATASET,
  execute
}) {
  const results = [];

  for (const evalCase of cases) {
    const startedAt = Date.now();

    try {
      const response = await execute(evalCase);
      const failures = evaluateFinanceAgentResponse({
        evalCase,
        response
      });

      results.push({
        durationInMs: Date.now() - startedAt,
        failures,
        id: evalCase.id,
        passed: failures.length === 0,
        response
      });
    } catch (error) {
      results.push({
        durationInMs: Date.now() - startedAt,
        failures: [error instanceof Error ? error.message : 'unknown eval error'],
        id: evalCase.id,
        passed: false
      });
    }
  }

  const passed = results.filter(({ passed: isPassed }) => isPassed).length;
  const total = cases.length;

  return {
    categorySummaries: summarizeFinanceAgentEvalByCategory({
      cases,
      results
    }),
    passRate: total > 0 ? passed / total : 0,
    passed,
    results,
    total
  };
}

export function getFinanceAgentEvalCategoryCounts(
  cases = FINANCE_AGENT_EVAL_DATASET
) {
  return cases.reduce(
    (result, { category }) => {
      result[category] += 1;

      return result;
    },
    {
      adversarial: 0,
      edge_case: 0,
      happy_path: 0,
      multi_step: 0
    }
  );
}
