import {
  AiAgentConfidence,
  AiAgentToolCall,
  AiAgentToolName,
  AiAgentVerificationCheck
} from './ai-agent.interfaces';

const CANDIDATE_TICKER_PATTERN = /\$?[A-Za-z0-9.]{1,10}/g;
const NORMALIZED_TICKER_PATTERN = /^(?=.*[A-Z])[A-Z0-9]{1,6}(?:\.[A-Z0-9]{1,4})?$/;
const SYMBOL_STOP_WORDS = new Set([
  'AND',
  'FOR',
  'GIVE',
  'HELP',
  'I',
  'IS',
  'MARKET',
  'OF',
  'PLEASE',
  'PORTFOLIO',
  'PRICE',
  'QUOTE',
  'RISK',
  'SHOW',
  'SYMBOL',
  'THE',
  'TICKER',
  'WHAT',
  'WITH'
]);

const INVESTMENT_INTENT_KEYWORDS = [
  'add',
  'allocat',
  'buy',
  'invest',
  'next',
  'rebalanc',
  'sell',
  'trim'
];

const REBALANCE_KEYWORDS = [
  'rebalanc',
  'reduce',
  'trim',
  'underweight',
  'overweight'
];

const STRESS_TEST_KEYWORDS = ['crash', 'drawdown', 'shock', 'stress'];

function normalizeSymbolCandidate(rawCandidate: string) {
  const hasDollarPrefix = rawCandidate.startsWith('$');
  const candidate = hasDollarPrefix
    ? rawCandidate.slice(1)
    : rawCandidate;

  if (!candidate) {
    return null;
  }

  const normalized = candidate.toUpperCase();

  if (SYMBOL_STOP_WORDS.has(normalized)) {
    return null;
  }

  if (!NORMALIZED_TICKER_PATTERN.test(normalized)) {
    return null;
  }

  // Conservative mode for non-prefixed symbols avoids false positives from
  // natural language words such as WHAT/THE/AND.
  if (!hasDollarPrefix && candidate !== candidate.toUpperCase()) {
    return null;
  }

  return normalized;
}

export function extractSymbolsFromQuery(query: string) {
  const matches = query.match(CANDIDATE_TICKER_PATTERN) ?? [];

  return Array.from(
    new Set(
      matches
        .map((candidate) => normalizeSymbolCandidate(candidate))
        .filter(Boolean)
    )
  );
}

export function determineToolPlan({
  query,
  symbols
}: {
  query: string;
  symbols?: string[];
}): AiAgentToolName[] {
  const normalizedQuery = query.toLowerCase();
  const selectedTools = new Set<AiAgentToolName>();
  const extractedSymbols = symbols?.length
    ? symbols
    : extractSymbolsFromQuery(query);
  const hasInvestmentIntent = INVESTMENT_INTENT_KEYWORDS.some((keyword) => {
    return normalizedQuery.includes(keyword);
  });
  const hasRebalanceIntent = REBALANCE_KEYWORDS.some((keyword) => {
    return normalizedQuery.includes(keyword);
  });
  const hasStressTestIntent = STRESS_TEST_KEYWORDS.some((keyword) => {
    return normalizedQuery.includes(keyword);
  });

  if (
    normalizedQuery.includes('portfolio') ||
    normalizedQuery.includes('holding') ||
    normalizedQuery.includes('allocation') ||
    normalizedQuery.includes('performance') ||
    normalizedQuery.includes('return')
  ) {
    selectedTools.add('portfolio_analysis');
  }

  if (
    normalizedQuery.includes('risk') ||
    normalizedQuery.includes('concentration') ||
    normalizedQuery.includes('diversif')
  ) {
    selectedTools.add('portfolio_analysis');
    selectedTools.add('risk_assessment');
  }

  if (hasInvestmentIntent || hasRebalanceIntent) {
    selectedTools.add('portfolio_analysis');
    selectedTools.add('risk_assessment');
    selectedTools.add('rebalance_plan');
  }

  if (hasStressTestIntent) {
    selectedTools.add('portfolio_analysis');
    selectedTools.add('risk_assessment');
    selectedTools.add('stress_test');
  }

  if (
    normalizedQuery.includes('quote') ||
    normalizedQuery.includes('price') ||
    normalizedQuery.includes('market') ||
    normalizedQuery.includes('ticker') ||
    extractedSymbols.length > 0
  ) {
    selectedTools.add('market_data_lookup');
  }

  if (selectedTools.size === 0) {
    selectedTools.add('portfolio_analysis');
    selectedTools.add('risk_assessment');
  }

  return Array.from(selectedTools);
}

export function calculateConfidence({
  toolCalls,
  verification
}: {
  toolCalls: AiAgentToolCall[];
  verification: AiAgentVerificationCheck[];
}): AiAgentConfidence {
  const successfulToolCalls = toolCalls.filter(({ status }) => {
    return status === 'success';
  }).length;

  const passedVerification = verification.filter(({ status }) => {
    return status === 'passed';
  }).length;

  const failedVerification = verification.filter(({ status }) => {
    return status === 'failed';
  }).length;

  const toolSuccessRate =
    toolCalls.length > 0 ? successfulToolCalls / toolCalls.length : 0;
  const verificationPassRate =
    verification.length > 0 ? passedVerification / verification.length : 0;

  let score = 0.4 + toolSuccessRate * 0.35 + verificationPassRate * 0.25;
  score -= failedVerification * 0.1;
  score = Math.max(0, Math.min(1, score));

  let band: AiAgentConfidence['band'] = 'low';

  if (score >= 0.8) {
    band = 'high';
  } else if (score >= 0.6) {
    band = 'medium';
  }

  return {
    band,
    score: Number(score.toFixed(2))
  };
}
