// Scoring algorithm with query type modifiers
import { Injectable } from '@nestjs/common';

import type {
  ConfidenceResult,
  FactCheckResult,
  HallucinationResult,
  QueryType,
  VerificationChecker,
  VerificationContext
} from './verification.interfaces';

const SPECULATIVE_PATTERNS = [
  /\bshould\s+(?:consider|look\s+into|evaluate|think\s+about|explore)\b/i,
  /\b(?:i|we)\s+(?:would\s+)?(?:recommend|suggest)\b/i,
  /\bmight\s+want\s+to\b/i,
  /\bconsider\s+(?:\w+ing)\b/i,
  /\bit\s+(?:may|might|could)\s+be\s+(?:worth|beneficial|wise|prudent)\b/i
];

const COMPARATIVE_KEYWORDS = [
  'compared to',
  'versus',
  'vs',
  'higher than',
  'lower than',
  'outperform',
  'underperform',
  'relative to',
  'difference between'
];

const QUERY_TYPE_MODIFIERS: Record<QueryType, number> = {
  direct_data_retrieval: 1.0,
  multi_tool_synthesis: 0.9,
  comparative_analysis: 0.85,
  speculative: 0.85,
  unsupported: 0.3
};

const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;

/**
 * Classify the query type based on tool call patterns and response content.
 */
export function classifyQueryType(context: VerificationContext): QueryType {
  const { toolCalls, agentResponseText } = context;

  const successfulCalls = toolCalls.filter((tc) => tc.success);

  // No tools called or all failed
  if (toolCalls.length === 0 || successfulCalls.length === 0) {
    return 'unsupported';
  }

  const responseLower = agentResponseText.toLowerCase();

  // Check for speculative language in the response
  const hasSpeculativeLanguage = SPECULATIVE_PATTERNS.some((pattern) =>
    pattern.test(responseLower)
  );

  if (hasSpeculativeLanguage) {
    return 'speculative';
  }

  // Check for comparative language - comparative analysis can occur even with a
  // single tool (e.g., "compare account A vs B" from one get_account_details call)
  const hasComparativeLanguage = COMPARATIVE_KEYWORDS.some((kw) =>
    responseLower.includes(kw)
  );

  if (hasComparativeLanguage && successfulCalls.length >= 1) {
    return 'comparative_analysis';
  }

  // Multiple tools with successful results = synthesis
  if (successfulCalls.length >= 2) {
    return 'multi_tool_synthesis';
  }

  // Single tool, data returned directly
  return 'direct_data_retrieval';
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function computeDataScore(context: VerificationContext): number {
  const { toolCalls, requestTimestamp } = context;

  if (toolCalls.length === 0) {
    return 0;
  }

  let score = 0;

  // +0.2 if all tools succeeded
  const allSucceeded = toolCalls.every((tc) => tc.success);
  if (allSucceeded) {
    score += 0.2;
  }

  // +0.1 if no timeouts (heuristic: calls taking >30s are likely timeouts)
  // Timeout detection is independent of success
  const hasTimeouts = toolCalls.some((tc) => tc.durationMs > 30_000);
  if (!hasTimeouts) {
    score += 0.1;
  }

  // Data freshness: compare requestTimestamp against newest tool call timestamp
  const newestTimestamp = toolCalls.reduce<Date | null>((latest, tc) => {
    if (!latest || tc.timestamp > latest) {
      return tc.timestamp;
    }
    return latest;
  }, null);

  if (newestTimestamp) {
    const ageMs = Math.abs(
      requestTimestamp.getTime() - newestTimestamp.getTime()
    );

    if (ageMs < ONE_HOUR_MS) {
      score += 0.1;
    } else if (ageMs < ONE_DAY_MS) {
      score += 0.05;
    }
  }

  return score;
}

function computeFactScore(factCheck: FactCheckResult): number {
  const total = factCheck.verifiedCount + factCheck.unverifiedCount;

  if (total === 0) {
    // No numbers to verify; treat as neutral-passing
    return 0.3;
  }

  if (factCheck.passed && factCheck.unverifiedCount === 0) {
    return 0.3;
  }

  const verifiedRatio = factCheck.verifiedCount / total;
  return 0.3 * verifiedRatio;
}

function computeHallucinationScore(hallucination: HallucinationResult): number {
  return 0.3 * (1 - hallucination.rate);
}

function buildReasoning(
  level: 'HIGH' | 'MEDIUM' | 'LOW',
  queryType: QueryType,
  factCheck: FactCheckResult,
  hallucination: HallucinationResult,
  dataScore: number
): string {
  const parts: string[] = [];

  if (level === 'HIGH') {
    parts.push('All data verified with high confidence.');
  } else if (level === 'MEDIUM') {
    parts.push(
      'Medium confidence: some figures could not be verified against tool data.'
    );
  } else {
    parts.push(
      'Low confidence: significant portions of the response could not be verified.'
    );
  }

  // Query type context
  const queryTypeLabels: Record<QueryType, string> = {
    direct_data_retrieval: 'Single data source query.',
    multi_tool_synthesis: 'Response synthesizes data from multiple tools.',
    comparative_analysis: 'Response compares multiple data sets.',
    speculative: 'Response contains recommendations or projections.',
    unsupported: 'No tool data available to verify.'
  };
  parts.push(queryTypeLabels[queryType]);

  // Fact-check detail
  if (factCheck.unverifiedCount > 0) {
    parts.push(
      `${factCheck.unverifiedCount} of ${factCheck.verifiedCount + factCheck.unverifiedCount + factCheck.derivedCount} figures unverified.`
    );
  }

  // Hallucination detail
  if (hallucination.detected) {
    parts.push(
      `${hallucination.ungroundedClaims} ungrounded claim${hallucination.ungroundedClaims === 1 ? '' : 's'} detected.`
    );
  }

  // Data freshness
  if (dataScore < 0.1) {
    parts.push('Tool data may be stale.');
  }

  return parts.join(' ');
}

@Injectable()
export class ConfidenceScorer implements VerificationChecker {
  public readonly stageName = 'confidenceScorer';
  public score(
    context: VerificationContext,
    factCheck: FactCheckResult,
    hallucination: HallucinationResult
  ): ConfidenceResult {
    const queryType = classifyQueryType(context);

    const dataScore = computeDataScore(context);
    const factScore = computeFactScore(factCheck);
    const hallucinationScore = computeHallucinationScore(hallucination);
    const queryTypeModifier = QUERY_TYPE_MODIFIERS[queryType];

    const rawScore =
      (dataScore + factScore + hallucinationScore) * queryTypeModifier;
    const finalScore = clamp(Math.round(rawScore * 1000) / 1000, 0, 1);

    const level: 'HIGH' | 'MEDIUM' | 'LOW' =
      finalScore > 0.7 ? 'HIGH' : finalScore >= 0.4 ? 'MEDIUM' : 'LOW';

    const reasoning = buildReasoning(
      level,
      queryType,
      factCheck,
      hallucination,
      dataScore
    );

    return {
      score: finalScore,
      level,
      reasoning,
      breakdown: {
        dataScore,
        factScore,
        hallucinationScore,
        queryTypeModifier
      },
      queryType
    };
  }
}
