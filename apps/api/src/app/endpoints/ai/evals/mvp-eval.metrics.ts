import {
  AiAgentMvpEvalCase,
  AiAgentMvpEvalResult,
  AiAgentMvpEvalVerificationExpectation
} from './mvp-eval.interfaces';

function matchesExpectedVerification({
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

export function calculateHallucinationRate({
  results
}: {
  results: AiAgentMvpEvalResult[];
}) {
  const responses = results
    .map(({ response }) => response)
    .filter(Boolean);

  if (responses.length === 0) {
    return 0;
  }

  const hallucinationFlags = responses.filter((response) => {
    const citationCoverageCheck = response.verification.find(({ check }) => {
      return check === 'citation_coverage';
    });

    return (
      citationCoverageCheck?.status === 'failed' ||
      citationCoverageCheck?.status === 'warning'
    );
  }).length;

  return hallucinationFlags / responses.length;
}

export function calculateVerificationAccuracy({
  cases,
  results
}: {
  cases: AiAgentMvpEvalCase[];
  results: AiAgentMvpEvalResult[];
}) {
  const resultsById = new Map(
    results.map((result) => {
      return [result.id, result];
    })
  );
  let matched = 0;
  let total = 0;

  for (const evalCase of cases) {
    const expectedChecks = evalCase.expected.verificationChecks ?? [];

    if (expectedChecks.length === 0) {
      continue;
    }

    const responseChecks = resultsById.get(evalCase.id)?.response?.verification ?? [];

    for (const expectedCheck of expectedChecks) {
      total += 1;

      if (
        matchesExpectedVerification({
          actualChecks: responseChecks,
          expectedCheck
        })
      ) {
        matched += 1;
      }
    }
  }

  return total > 0 ? matched / total : 1;
}
