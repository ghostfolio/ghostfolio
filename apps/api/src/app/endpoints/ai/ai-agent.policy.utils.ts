import { AiAgentToolName } from './ai-agent.interfaces';

const FINANCE_READ_INTENT_KEYWORDS = [
  'asset',
  'allocation',
  'balance',
  'cash',
  'concentration',
  'diversif',
  'equity',
  'holding',
  'market',
  'money',
  'performance',
  'portfolio',
  'price',
  'quote',
  'return',
  'risk',
  'stress',
  'ticker',
  'valu',
  'worth'
];
const REBALANCE_CONFIRMATION_KEYWORDS = [
  'allocat',
  'buy',
  'invest',
  'rebalanc',
  'sell',
  'trim'
];
const GREETING_ONLY_PATTERN =
  /^\s*(?:hi|hello|hey|thanks|thank you|good morning|good afternoon|good evening)\s*[!.?]*\s*$/i;
const SIMPLE_ARITHMETIC_QUERY_PATTERN =
  /^\s*(?:what(?:'s| is)\s+)?[-+*/().\d\s%=]+\??\s*$/i;
const SIMPLE_ARITHMETIC_OPERATOR_PATTERN = /[+\-*/]/;
const SIMPLE_ARITHMETIC_PREFIX_PATTERN = /^\s*(?:what(?:'s| is)\s+)?/i;
const SIMPLE_ASSISTANT_QUERY_PATTERNS = [
  /^\s*(?:who are you|what are you|what can you do)\s*[!.?]*\s*$/i,
  /^\s*(?:how do you work|how (?:can|do) i use (?:you|this))\s*[!.?]*\s*$/i,
  /^\s*(?:help|assist(?: me)?|what can you help with)\s*[!.?]*\s*$/i
];
const DIRECT_IDENTITY_QUERY_PATTERN = /\b(?:who are you|what are you)\b/i;
const DIRECT_USAGE_QUERY_PATTERN =
  /\b(?:how do you work|how (?:can|do) i use (?:you|this)|how should i ask)\b/i;
const DIRECT_CAPABILITY_QUERY_PATTERN =
  /\b(?:what can (?:you|i) do|help|assist(?: me)?|what can you help with)\b/i;
const READ_ONLY_TOOLS = new Set<AiAgentToolName>([
  'portfolio_analysis',
  'risk_assessment',
  'market_data_lookup',
  'stress_test'
]);

export type AiAgentPolicyRoute = 'direct' | 'tools' | 'clarify';
export type AiAgentPolicyBlockReason =
  | 'none'
  | 'no_tool_query'
  | 'read_only'
  | 'needs_confirmation'
  | 'unauthorized_access'
  | 'unknown';

export interface AiAgentToolPolicyDecision {
  blockedByPolicy: boolean;
  blockReason: AiAgentPolicyBlockReason;
  forcedDirect: boolean;
  plannedTools: AiAgentToolName[];
  route: AiAgentPolicyRoute;
  toolsToExecute: AiAgentToolName[];
}

function includesKeyword({
  keywords,
  normalizedQuery
}: {
  keywords: readonly string[];
  normalizedQuery: string;
}) {
  return keywords.some((keyword) => {
    return normalizedQuery.includes(keyword);
  });
}

function isNoToolDirectQuery(query: string) {
  if (GREETING_ONLY_PATTERN.test(query)) {
    return true;
  }

  if (
    SIMPLE_ASSISTANT_QUERY_PATTERNS.some((pattern) => {
      return pattern.test(query);
    })
  ) {
    return true;
  }

  const normalized = query.trim();

  if (!SIMPLE_ARITHMETIC_QUERY_PATTERN.test(normalized)) {
    return false;
  }

  return (
    SIMPLE_ARITHMETIC_OPERATOR_PATTERN.test(normalized) &&
    /\d/.test(normalized)
  );
}

function isUnauthorizedPortfolioQuery(query: string) {
  const normalized = query.trim().toLowerCase();
  const referencesOtherUserData =
    /\b(?:john'?s|someone else'?s|another user'?s|other users'?|all users'?|everyone'?s|their)\b/.test(
      normalized
    ) &&
    /\b(?:portfolio|account|holdings?|balance|data)\b/.test(normalized);
  const requestsSystemWideData =
    /\bwhat portfolios do you have access to\b/.test(normalized) ||
    /\bshow all (?:users|portfolios|accounts)\b/.test(normalized);

  return referencesOtherUserData || requestsSystemWideData;
}

function formatNumericResult(value: number) {
  if (Math.abs(value) < Number.EPSILON) {
    return '0';
  }

  if (Number.isInteger(value)) {
    return value.toString();
  }

  return value.toFixed(6).replace(/\.?0+$/, '');
}

function evaluateArithmeticExpression(expression: string) {
  let cursor = 0;

  const skipWhitespace = () => {
    while (cursor < expression.length && /\s/.test(expression[cursor])) {
      cursor += 1;
    }
  };

  const parseNumber = () => {
    skipWhitespace();
    const start = cursor;
    let dotCount = 0;

    while (cursor < expression.length) {
      const token = expression[cursor];

      if (token >= '0' && token <= '9') {
        cursor += 1;
        continue;
      }

      if (token === '.') {
        dotCount += 1;

        if (dotCount > 1) {
          return undefined;
        }

        cursor += 1;
        continue;
      }

      break;
    }

    if (start === cursor) {
      return undefined;
    }

    const parsed = Number(expression.slice(start, cursor));

    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const parseFactor = (): number | undefined => {
    skipWhitespace();

    if (expression[cursor] === '+') {
      cursor += 1;
      return parseFactor();
    }

    if (expression[cursor] === '-') {
      cursor += 1;
      const nested = parseFactor();

      return nested === undefined ? undefined : -nested;
    }

    if (expression[cursor] === '(') {
      cursor += 1;
      const nested = parseExpression();

      skipWhitespace();
      if (nested === undefined || expression[cursor] !== ')') {
        return undefined;
      }

      cursor += 1;
      return nested;
    }

    return parseNumber();
  };

  const parseTerm = (): number | undefined => {
    let value = parseFactor();

    if (value === undefined) {
      return undefined;
    }

    while (true) {
      skipWhitespace();
      const operator = expression[cursor];

      if (operator !== '*' && operator !== '/') {
        break;
      }

      cursor += 1;
      const right = parseFactor();

      if (right === undefined) {
        return undefined;
      }

      if (operator === '*') {
        value *= right;
      } else {
        if (Math.abs(right) < Number.EPSILON) {
          return undefined;
        }

        value /= right;
      }
    }

    return value;
  };

  const parseExpression = (): number | undefined => {
    let value = parseTerm();

    if (value === undefined) {
      return undefined;
    }

    while (true) {
      skipWhitespace();
      const operator = expression[cursor];

      if (operator !== '+' && operator !== '-') {
        break;
      }

      cursor += 1;
      const right = parseTerm();

      if (right === undefined) {
        return undefined;
      }

      if (operator === '+') {
        value += right;
      } else {
        value -= right;
      }
    }

    return value;
  };

  const result = parseExpression();

  skipWhitespace();

  if (result === undefined || cursor !== expression.length || !Number.isFinite(result)) {
    return undefined;
  }

  return result;
}

function evaluateSimpleArithmetic(query: string) {
  const normalized = query.trim();

  if (
    !SIMPLE_ARITHMETIC_QUERY_PATTERN.test(normalized) ||
    !SIMPLE_ARITHMETIC_OPERATOR_PATTERN.test(normalized) ||
    !/\d/.test(normalized)
  ) {
    return undefined;
  }

  const expression = normalized
    .replace(SIMPLE_ARITHMETIC_PREFIX_PATTERN, '')
    .replace(/\?+$/, '')
    .replace(/=/g, '')
    .trim();

  if (!expression) {
    return undefined;
  }

  const result = evaluateArithmeticExpression(expression);

  if (result === undefined) {
    return undefined;
  }

  return `${expression} = ${formatNumericResult(result)}`;
}

function createNoToolDirectResponse(query?: string) {
  const normalizedQuery = query?.trim().toLowerCase() ?? '';

  if (DIRECT_IDENTITY_QUERY_PATTERN.test(normalizedQuery)) {
    return [
      'I am Ghostfolio AI, your portfolio copilot for this account.',
      'I analyze concentration risk, summarize holdings, fetch market quotes, run stress scenarios, and compose diversification or rebalance options.',
      'Try one of these:',
      '- "Give me a concentration risk summary"',
      '- "Show the latest prices for my top holdings"',
      '- "Help me diversify with 2-3 optioned plans"'
    ].join('\n');
  }

  if (DIRECT_USAGE_QUERY_PATTERN.test(normalizedQuery)) {
    return [
      'I am Ghostfolio AI. Use short direct prompts and include your goal or constraint.',
      'Good pattern: objective + scope + constraint (for example, "reduce top holding below 35% with low tax impact").',
      'I can return analysis, recommendation options, stress scenarios, and market snapshots with citations.',
      'If key constraints are missing, I will ask up to 3 follow-up questions before giving trade-style steps.'
    ].join('\n');
  }

  if (DIRECT_CAPABILITY_QUERY_PATTERN.test(normalizedQuery)) {
    return [
      'I am Ghostfolio AI. You can use me in three modes: diagnose, recommend, and verify.',
      'Diagnose: concentration risk, top exposures, and allocation summaries.',
      'Recommend: optioned diversification/rebalance plans with assumptions and next questions.',
      'Verify: live quote checks and stress-scenario impact estimates.',
      'Try next:',
      '- "Analyze my concentration risk"',
      '- "Help me diversify with new-money and sell/rotate options"',
      '- "Run a 20% downside stress test"'
    ].join('\n');
  }

  const greetingPattern = /^(hi|hello|hey|hiya|greetings|good (morning|afternoon|evening))/i;
  const acknowledgmentPattern = /^(thanks|thank you|thx|ty|ok|okay|great|awesome|perfect)/i;

  if (greetingPattern.test(normalizedQuery)) {
    const greetings = [
      "Hello! I'm here to help with your portfolio analysis. What would you like to know?",
      "Hi! I can help you understand your portfolio better. What's on your mind?",
      "Hey there! Ready to dive into your portfolio? Just ask!"
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  if (acknowledgmentPattern.test(normalizedQuery)) {
    const acknowledgments = [
      "You're welcome! Let me know if you need anything else.",
      "Happy to help! What else would you like to know?",
      "Anytime! Feel free to ask if you have more questions."
    ];
    return acknowledgments[Math.floor(Math.random() * acknowledgments.length)];
  }

  const defaults = [
    "I'm here to help with your portfolio! You can ask me things like 'Show my top holdings' or 'What's my concentration risk?'",
    "Sure! I can analyze your portfolio, check concentration risks, look up market prices, and more. What would you like to explore?",
    "I'd be happy to help! Try asking about your holdings, risk analysis, or market data for your investments."
  ];

  return defaults[Math.floor(Math.random() * defaults.length)];
}

export function applyToolExecutionPolicy({
  plannedTools,
  query
}: {
  plannedTools: AiAgentToolName[];
  query: string;
}): AiAgentToolPolicyDecision {
  const normalizedQuery = query.toLowerCase();
  const deduplicatedPlannedTools = Array.from(new Set(plannedTools));
  const hasActionIntent = includesKeyword({
    keywords: REBALANCE_CONFIRMATION_KEYWORDS,
    normalizedQuery
  });
  const hasReadIntent = includesKeyword({
    keywords: FINANCE_READ_INTENT_KEYWORDS,
    normalizedQuery
  });

  if (isUnauthorizedPortfolioQuery(query)) {
    return {
      blockedByPolicy: deduplicatedPlannedTools.length > 0,
      blockReason: 'unauthorized_access',
      forcedDirect: true,
      plannedTools: deduplicatedPlannedTools,
      route: 'direct',
      toolsToExecute: []
    };
  }

  if (isNoToolDirectQuery(query)) {
    return {
      blockedByPolicy: deduplicatedPlannedTools.length > 0,
      blockReason: 'no_tool_query',
      forcedDirect: deduplicatedPlannedTools.length > 0,
      plannedTools: deduplicatedPlannedTools,
      route: 'direct',
      toolsToExecute: []
    };
  }

  if (deduplicatedPlannedTools.length === 0) {
    return {
      blockedByPolicy: false,
      blockReason: hasReadIntent || hasActionIntent ? 'unknown' : 'no_tool_query',
      forcedDirect: false,
      plannedTools: [],
      route: hasReadIntent || hasActionIntent ? 'clarify' : 'direct',
      toolsToExecute: []
    };
  }

  let toolsToExecute = deduplicatedPlannedTools;
  let blockedByPolicy = false;
  let blockReason: AiAgentPolicyBlockReason = 'none';

  if (!hasActionIntent && toolsToExecute.includes('rebalance_plan')) {
    toolsToExecute = toolsToExecute.filter((tool) => {
      return tool !== 'rebalance_plan';
    });
    blockedByPolicy = true;
    blockReason = 'needs_confirmation';
  }

  if (!hasActionIntent) {
    const readOnlyTools = toolsToExecute.filter((tool) => {
      return READ_ONLY_TOOLS.has(tool);
    });

    if (readOnlyTools.length !== toolsToExecute.length) {
      toolsToExecute = readOnlyTools;
      blockedByPolicy = true;
      blockReason = blockReason === 'none' ? 'read_only' : blockReason;
    }
  }

  if (toolsToExecute.length === 0) {
    const route: AiAgentPolicyRoute = hasReadIntent || hasActionIntent
      ? 'clarify'
      : 'direct';

    return {
      blockedByPolicy: blockedByPolicy || deduplicatedPlannedTools.length > 0,
      blockReason: blockReason === 'none'
        ? route === 'clarify'
          ? 'unknown'
          : 'no_tool_query'
        : blockReason,
      forcedDirect: route === 'direct',
      plannedTools: deduplicatedPlannedTools,
      route,
      toolsToExecute: []
    };
  }

  return {
    blockedByPolicy,
    blockReason,
    forcedDirect: false,
    plannedTools: deduplicatedPlannedTools,
    route: 'tools',
    toolsToExecute
  };
}

export function createPolicyRouteResponse({
  policyDecision,
  query
}: {
  policyDecision: AiAgentToolPolicyDecision;
  query?: string;
}) {
  if (policyDecision.route === 'clarify') {
    if (policyDecision.blockReason === 'needs_confirmation') {
      return `Please confirm your action goal so I can produce a concrete plan. Example: "Rebalance to keep each holding below 35%" or "Allocate 2000 USD across underweight positions."`;
    }

    return `I can help with allocation review, concentration risk, market prices, and stress scenarios. Which one should I run next? Example: "Show concentration risk" or "Price for NVDA".`;
  }

  if (
    policyDecision.route === 'direct' &&
    policyDecision.blockReason === 'no_tool_query'
  ) {
    const arithmeticResult = query ? evaluateSimpleArithmetic(query) : undefined;

    if (arithmeticResult) {
      return arithmeticResult;
    }

    return createNoToolDirectResponse(query);
  }

  if (
    policyDecision.route === 'direct' &&
    policyDecision.blockReason === 'unauthorized_access'
  ) {
    return `I can access only your own portfolio data in this account. Ask about your holdings, balance, risk, or allocation and I will help.`;
  }

  return `I can help with portfolio analysis, concentration risk, market prices, and stress scenarios. Ask a portfolio question when you are ready.`;
}

export function formatPolicyVerificationDetails({
  policyDecision
}: {
  policyDecision: AiAgentToolPolicyDecision;
}) {
  const plannedTools = policyDecision.plannedTools.length > 0
    ? policyDecision.plannedTools.join(', ')
    : 'none';
  const executedTools = policyDecision.toolsToExecute.length > 0
    ? policyDecision.toolsToExecute.join(', ')
    : 'none';

  return `route=${policyDecision.route}; blocked_by_policy=${policyDecision.blockedByPolicy}; block_reason=${policyDecision.blockReason}; forced_direct=${policyDecision.forcedDirect}; planned_tools=${plannedTools}; executed_tools=${executedTools}`;
}
