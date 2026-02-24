import { AiAgentToolName } from './ai-agent.interfaces';

const FINANCE_READ_INTENT_KEYWORDS = [
  'allocation',
  'concentration',
  'diversif',
  'holding',
  'market',
  'performance',
  'portfolio',
  'price',
  'quote',
  'return',
  'risk',
  'stress',
  'ticker'
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
const SIMPLE_ASSISTANT_QUERY_PATTERNS = [
  /^\s*(?:who are you|what are you|what can you do)\s*[!.?]*\s*$/i,
  /^\s*(?:how do you work|how (?:can|do) i use (?:you|this))\s*[!.?]*\s*$/i,
  /^\s*(?:help|assist(?: me)?|what can you help with)\s*[!.?]*\s*$/i
];
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
  policyDecision
}: {
  policyDecision: AiAgentToolPolicyDecision;
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
    return `I am your Ghostfolio AI assistant. I can help with portfolio analysis, concentration risk, market prices, rebalancing ideas, and stress scenarios. Try: "Show my top holdings" or "What is my concentration risk?".`;
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
