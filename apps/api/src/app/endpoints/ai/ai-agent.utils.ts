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
  'how do i',
  'invest',
  'next',
  'rebalanc',
  'sell',
  'trim',
  'what can i do',
  'what should i do',
  'where should i'
];

const REBALANCE_KEYWORDS = [
  'rebalanc',
  'reduce',
  'trim',
  'underweight',
  'overweight'
];

const STRESS_TEST_KEYWORDS = ['crash', 'drawdown', 'shock', 'stress'];
const PORTFOLIO_VALUE_CONTEXT_PATTERN =
  /\b(?:i|my|me|portfolio|account|accounts|holdings|invested|investment|total)\b/;
const PORTFOLIO_VALUE_QUESTION_PATTERN =
  /\b(?:how\s*much|what(?:'s| is)|show|tell|do i have|total)\b/;
const PORTFOLIO_VALUE_KEYWORD_PATTERN =
  /\b(?:money|cash|value|worth|balance|net\s+worth|assets|equity)\b/;
const PORTFOLIO_VALUE_QUERY_PATTERNS = [
  /\b(?:net\s+worth|portfolio\s+value|portfolio\s+worth|account\s+balance|total\s+portfolio\s+value)\b/,
  /\bhow\s*much\b.*\b(?:money|cash|value|worth|balance)\b/
];
const ANSWER_NUMERIC_INTENT_KEYWORDS = [
  'allocat',
  'balance',
  'drawdown',
  'hhi',
  'market',
  'money',
  'performance',
  'price',
  'quote',
  'return',
  'risk',
  'shock',
  'stress',
  'trim',
  'worth'
];
const ANSWER_ACTIONABLE_KEYWORDS = [
  'add',
  'allocate',
  'buy',
  'hedge',
  'increase',
  'monitor',
  'rebalance',
  'reduce',
  'sell',
  'trim'
];
const DISALLOWED_RESPONSE_PATTERNS = [
  /\bas an ai\b/i,
  /\bi am not (?:a|your) financial advisor\b/i,
  /\bi can(?:not|'t) provide financial advice\b/i,
  /\bconsult (?:a|your) financial advisor\b/i
];
const MINIMUM_GENERATED_ANSWER_WORDS = 12;

interface AnswerQualitySignals {
  disallowedPhraseDetected: boolean;
  hasActionableGuidance: boolean;
  hasInvestmentIntent: boolean;
  hasNumericIntent: boolean;
  hasNumericSignal: boolean;
  sentenceCount: number;
  wordCount: number;
}

function normalizeIntentQuery(query: string) {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getAnswerQualitySignals({
  answer,
  query
}: {
  answer: string;
  query: string;
}): AnswerQualitySignals {
  const normalizedAnswer = answer.trim();
  const normalizedAnswerLowerCase = normalizedAnswer.toLowerCase();
  const normalizedQueryLowerCase = query.toLowerCase();
  const words = normalizedAnswer.split(/\s+/).filter(Boolean);
  const sentenceCount = normalizedAnswer
    .split(/[.!?](?:\s+|$)/)
    .map((sentence) => sentence.trim())
    .filter(Boolean).length;
  const hasInvestmentIntent = INVESTMENT_INTENT_KEYWORDS.some((keyword) => {
    return normalizedQueryLowerCase.includes(keyword);
  });
  const hasNumericIntent = ANSWER_NUMERIC_INTENT_KEYWORDS.some((keyword) => {
    return normalizedQueryLowerCase.includes(keyword);
  });
  const hasActionableGuidance = ANSWER_ACTIONABLE_KEYWORDS.some((keyword) => {
    return normalizedAnswerLowerCase.includes(keyword);
  });
  const hasNumericSignal = /\d/.test(normalizedAnswer);
  const disallowedPhraseDetected = DISALLOWED_RESPONSE_PATTERNS.some((pattern) => {
    return pattern.test(normalizedAnswer);
  });

  return {
    disallowedPhraseDetected,
    hasActionableGuidance,
    hasInvestmentIntent,
    hasNumericIntent,
    hasNumericSignal,
    sentenceCount,
    wordCount: words.length
  };
}

export function isGeneratedAnswerReliable({
  answer,
  query
}: {
  answer: string;
  query: string;
}) {
  const qualitySignals = getAnswerQualitySignals({ answer, query });

  if (qualitySignals.disallowedPhraseDetected) {
    return false;
  }

  if (qualitySignals.wordCount < MINIMUM_GENERATED_ANSWER_WORDS) {
    return false;
  }

  if (qualitySignals.hasInvestmentIntent && !qualitySignals.hasActionableGuidance) {
    return false;
  }

  if (qualitySignals.hasNumericIntent && !qualitySignals.hasNumericSignal) {
    return false;
  }

  return true;
}

export function evaluateAnswerQuality({
  answer,
  query
}: {
  answer: string;
  query: string;
}): AiAgentVerificationCheck {
  const qualitySignals = getAnswerQualitySignals({ answer, query });
  const issues: string[] = [];

  if (qualitySignals.disallowedPhraseDetected) {
    issues.push('Response contains a generic AI disclaimer');
  }

  if (qualitySignals.wordCount < MINIMUM_GENERATED_ANSWER_WORDS) {
    issues.push(
      `Response length is short (${qualitySignals.wordCount} words; target >= ${MINIMUM_GENERATED_ANSWER_WORDS})`
    );
  }

  if (qualitySignals.sentenceCount < 2) {
    issues.push(
      `Response uses limited structure (${qualitySignals.sentenceCount} sentence)`
    );
  }

  if (qualitySignals.hasInvestmentIntent && !qualitySignals.hasActionableGuidance) {
    issues.push('Investment request lacks explicit action guidance');
  }

  if (qualitySignals.hasNumericIntent && !qualitySignals.hasNumericSignal) {
    issues.push('Quantitative query response lacks numeric support');
  }

  if (qualitySignals.disallowedPhraseDetected) {
    return {
      check: 'response_quality',
      details: issues.join('; '),
      status: 'failed'
    };
  }

  return {
    check: 'response_quality',
    details:
      issues.length > 0
        ? issues.join('; ')
        : 'Response passed structure, actionability, and evidence heuristics',
    status: issues.length === 0 ? 'passed' : 'warning'
  };
}

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
  const normalizedQuery = normalizeIntentQuery(query);
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
  const hasBroadPortfolioValueIntent =
    PORTFOLIO_VALUE_QUESTION_PATTERN.test(normalizedQuery) &&
    PORTFOLIO_VALUE_KEYWORD_PATTERN.test(normalizedQuery) &&
    PORTFOLIO_VALUE_CONTEXT_PATTERN.test(normalizedQuery);
  const hasPortfolioValueIntent = PORTFOLIO_VALUE_QUERY_PATTERNS.some(
    (pattern) => {
      return pattern.test(normalizedQuery);
    }
  ) || hasBroadPortfolioValueIntent;

  if (
    normalizedQuery.includes('portfolio') ||
    normalizedQuery.includes('holding') ||
    normalizedQuery.includes('allocation') ||
    normalizedQuery.includes('performance') ||
    normalizedQuery.includes('return')
  ) {
    selectedTools.add('portfolio_analysis');
  }

  if (hasPortfolioValueIntent) {
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
