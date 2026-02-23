import { AiService } from '../ai.service';

import {
  AiAgentMvpEvalCase,
  AiAgentMvpEvalResult,
  AiAgentMvpEvalVerificationExpectation
} from './mvp-eval.interfaces';

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
}) {
  const results: AiAgentMvpEvalResult[] = [];

  for (const evalCase of cases) {
    results.push(
      await runMvpEvalCase({
        aiService: aiServiceFactory(evalCase),
        evalCase
      })
    );
  }

  const passed = results.filter(({ passed: isPassed }) => isPassed).length;
  const passRate = cases.length > 0 ? passed / cases.length : 0;

  return {
    passRate,
    passed,
    results,
    total: cases.length
  };
}
