import { AiService } from '../ai.service';
import { Client, RunTree } from 'langsmith';

import {
  AiAgentMvpEvalCategory,
  AiAgentMvpEvalCategorySummary,
  AiAgentMvpEvalCase,
  AiAgentMvpEvalResult,
  AiAgentMvpEvalSuiteResult,
  AiAgentMvpEvalVerificationExpectation
} from './mvp-eval.interfaces';
import {
  calculateHallucinationRate,
  calculateVerificationAccuracy
} from './mvp-eval.metrics';

const OBSERVABILITY_TIMEOUT_IN_MS = 1_000;
const ENV_PLACEHOLDER_PATTERN = /^<[^>]+>$/;
const EVAL_CATEGORIES: AiAgentMvpEvalCategory[] = [
  'happy_path',
  'edge_case',
  'adversarial',
  'multi_step'
];

function getLangSmithApiKey() {
  return process.env.LANGSMITH_API_KEY || process.env.LANGCHAIN_API_KEY;
}

function getLangSmithEndpoint() {
  return process.env.LANGSMITH_ENDPOINT || process.env.LANGCHAIN_ENDPOINT;
}

function getLangSmithProjectName() {
  return (
    process.env.LANGSMITH_PROJECT ||
    process.env.LANGCHAIN_PROJECT ||
    'ghostfolio-ai-agent'
  );
}

function isLangSmithTracingEnabled() {
  return (
    process.env.LANGSMITH_TRACING === 'true' ||
    process.env.LANGCHAIN_TRACING_V2 === 'true'
  );
}

function hasValidLangSmithApiKey(apiKey?: string) {
  const normalizedApiKey = apiKey?.trim();

  return Boolean(normalizedApiKey) && !ENV_PLACEHOLDER_PATTERN.test(normalizedApiKey);
}

async function runSafely(operation: () => Promise<void>) {
  let timeoutId: NodeJS.Timeout | undefined;

  try {
    await Promise.race([
      operation().catch(() => undefined),
      new Promise<void>((resolve) => {
        timeoutId = setTimeout(resolve, OBSERVABILITY_TIMEOUT_IN_MS);
        timeoutId.unref?.();
      })
    ]);
  } catch {
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function summarizeByCategory({
  cases,
  results
}: {
  cases: AiAgentMvpEvalCase[];
  results: AiAgentMvpEvalResult[];
}): AiAgentMvpEvalCategorySummary[] {
  const passedById = new Map(
    results.map(({ id, passed }) => {
      return [id, passed];
    })
  );
  const categoryStats = new Map<
    AiAgentMvpEvalCategory,
    { passed: number; total: number }
  >(
    EVAL_CATEGORIES.map((category) => {
      return [category, { passed: 0, total: 0 }];
    })
  );

  for (const evalCase of cases) {
    const categorySummary = categoryStats.get(evalCase.category);

    if (!categorySummary) {
      continue;
    }

    categorySummary.total += 1;

    if (passedById.get(evalCase.id)) {
      categorySummary.passed += 1;
    }
  }

  return EVAL_CATEGORIES.map((category) => {
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

function createEvalSuiteRun({
  cases
}: {
  cases: AiAgentMvpEvalCase[];
}) {
  const apiKey = getLangSmithApiKey();

  if (!hasValidLangSmithApiKey(apiKey) || !isLangSmithTracingEnabled()) {
    return undefined;
  }

  const client = new Client({
    apiKey: apiKey.trim(),
    apiUrl: getLangSmithEndpoint()
  });

  return new RunTree({
    client,
    inputs: {
      categories: Array.from(
        new Set(
          cases.map(({ category }) => {
            return category;
          })
        )
      ),
      totalCases: cases.length
    },
    metadata: {
      type: 'mvp_eval_suite'
    },
    name: 'ghostfolio_ai_mvp_eval_suite',
    project_name: getLangSmithProjectName(),
    run_type: 'chain'
  });
}

async function captureEvalCaseRun({
  evalCase,
  result,
  suiteRunTree
}: {
  evalCase: AiAgentMvpEvalCase;
  result: AiAgentMvpEvalResult;
  suiteRunTree?: RunTree;
}) {
  if (!suiteRunTree) {
    return;
  }

  const caseRunTree = suiteRunTree.createChild({
    inputs: {
      expected: evalCase.expected,
      query: evalCase.input.query,
      sessionId: evalCase.input.sessionId
    },
    metadata: {
      category: evalCase.category,
      intent: evalCase.intent
    },
    name: `ghostfolio_ai_mvp_eval_case_${evalCase.id}`,
    run_type: 'tool'
  });

  await runSafely(async () => caseRunTree.postRun());
  await runSafely(async () =>
    caseRunTree.end(
      {
        durationInMs: result.durationInMs,
        failures: result.failures,
        passed: result.passed,
        toolCalls:
          result.response?.toolCalls.map(({ status, tool }) => {
            return { status, tool };
          }) ?? []
      },
      result.passed ? undefined : result.failures.join(' | ')
    )
  );
  await runSafely(async () => caseRunTree.patchRun());
}

async function finalizeSuiteRun({
  categorySummaries,
  hallucinationRate,
  passRate,
  passed,
  suiteRunTree,
  total,
  verificationAccuracy
}: {
  categorySummaries: AiAgentMvpEvalCategorySummary[];
  hallucinationRate: number;
  passRate: number;
  passed: number;
  suiteRunTree?: RunTree;
  total: number;
  verificationAccuracy: number;
}) {
  if (!suiteRunTree) {
    return;
  }

  await runSafely(async () =>
    suiteRunTree.end(
      {
        categorySummaries,
        hallucinationRate,
        passRate,
        passed,
        total,
        verificationAccuracy
      },
      passRate >= 0.8 ? undefined : 'mvp eval pass rate below threshold'
    )
  );
  await runSafely(async () => suiteRunTree.patchRun());
}

function hasExpectedVerification({
  actualChecks,
  expectedCheck
}: {
  actualChecks: { check: string; status: 'passed' | 'warning' | 'failed' }[];
  expectedCheck: AiAgentMvpEvalVerificationExpectation;
}) {
  return actualChecks.some(({ check, status }) => {
    if (check !== expectedCheck.check) {
      return false;
    }

    if (!expectedCheck.status) {
      return true;
    }

    return status === expectedCheck.status;
  });
}

function evaluateResponse({
  evalCase,
  response
}: {
  evalCase: AiAgentMvpEvalCase;
  response: Awaited<ReturnType<AiService['chat']>>;
}) {
  const failures: string[] = [];
  const observedTools = response.toolCalls.map(({ tool }) => tool);

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
    const matched = response.toolCalls.some((toolCall) => {
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
    response.citations.length < evalCase.expected.minCitations
  ) {
    failures.push(
      `Expected at least ${evalCase.expected.minCitations} citation(s), got ${response.citations.length}`
    );
  }

  if (
    typeof evalCase.expected.memoryTurnsAtLeast === 'number' &&
    response.memory.turns < evalCase.expected.memoryTurnsAtLeast
  ) {
    failures.push(
      `Expected memory turns >= ${evalCase.expected.memoryTurnsAtLeast}, got ${response.memory.turns}`
    );
  }

  if (
    typeof evalCase.expected.confidenceScoreMin === 'number' &&
    response.confidence.score < evalCase.expected.confidenceScoreMin
  ) {
    failures.push(
      `Expected confidence score >= ${evalCase.expected.confidenceScoreMin}, got ${response.confidence.score}`
    );
  }

  for (const expectedText of evalCase.expected.answerIncludes ?? []) {
    if (!response.answer.includes(expectedText)) {
      failures.push(`Answer does not include expected text: "${expectedText}"`);
    }
  }

  if (
    evalCase.expected.answerPattern &&
    !evalCase.expected.answerPattern.test(response.answer)
  ) {
    failures.push(
      `Answer does not match expected pattern: ${String(evalCase.expected.answerPattern)}`
    );
  }

  for (const expectedVerification of evalCase.expected.verificationChecks ?? []) {
    if (
      !hasExpectedVerification({
        actualChecks: response.verification,
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

export async function runMvpEvalCase({
  aiService,
  evalCase
}: {
  aiService: AiService;
  evalCase: AiAgentMvpEvalCase;
}): Promise<AiAgentMvpEvalResult> {
  const startedAt = Date.now();

  try {
    const response = await aiService.chat({
      languageCode: evalCase.input.languageCode ?? 'en',
      query: evalCase.input.query,
      sessionId: evalCase.input.sessionId,
      symbols: evalCase.input.symbols,
      userCurrency: evalCase.input.userCurrency ?? 'USD',
      userId: evalCase.input.userId
    });

    const failures = evaluateResponse({
      evalCase,
      response
    });

    return {
      durationInMs: Date.now() - startedAt,
      failures,
      id: evalCase.id,
      passed: failures.length === 0,
      response
    };
  } catch (error) {
    return {
      durationInMs: Date.now() - startedAt,
      failures: [error instanceof Error ? error.message : 'unknown eval error'],
      id: evalCase.id,
      passed: false
    };
  }
}

export async function runMvpEvalSuite({
  aiServiceFactory,
  cases
}: {
  aiServiceFactory: (evalCase: AiAgentMvpEvalCase) => AiService;
  cases: AiAgentMvpEvalCase[];
}): Promise<AiAgentMvpEvalSuiteResult> {
  const results: AiAgentMvpEvalResult[] = [];
  const suiteRunTree = createEvalSuiteRun({ cases });

  await runSafely(async () => suiteRunTree?.postRun());

  for (const evalCase of cases) {
    const result = await runMvpEvalCase({
      aiService: aiServiceFactory(evalCase),
      evalCase
    });

    results.push(result);

    await captureEvalCaseRun({
      evalCase,
      result,
      suiteRunTree
    });
  }

  const passed = results.filter(({ passed: isPassed }) => isPassed).length;
  const passRate = cases.length > 0 ? passed / cases.length : 0;
  const hallucinationRate = calculateHallucinationRate({
    results
  });
  const categorySummaries = summarizeByCategory({
    cases,
    results
  });
  const verificationAccuracy = calculateVerificationAccuracy({
    cases,
    results
  });

  await finalizeSuiteRun({
    categorySummaries,
    hallucinationRate,
    passRate,
    passed,
    suiteRunTree,
    total: cases.length,
    verificationAccuracy
  });

  return {
    passRate,
    passed,
    results,
    total: cases.length,
    categorySummaries,
    hallucinationRate: Number(hallucinationRate.toFixed(4)),
    verificationAccuracy: Number(verificationAccuracy.toFixed(4))
  };
}
