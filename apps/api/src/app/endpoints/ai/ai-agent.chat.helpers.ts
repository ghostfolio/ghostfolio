import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';

import { DataSource } from '@prisma/client';
import ms from 'ms';

import {
  AiAgentMemoryState,
  AiAgentUserPreferenceState,
  MarketDataLookupResult,
  PortfolioAnalysisResult,
  RebalancePlanResult,
  RiskAssessmentResult,
  StressTestResult
} from './ai-agent.chat.interfaces';
import {
  extractSymbolsFromQuery,
  isGeneratedAnswerReliable
} from './ai-agent.utils';

const AI_AGENT_MEMORY_TTL = ms('24 hours');
const AI_AGENT_USER_PREFERENCES_TTL = ms('90 days');
const DEFAULT_LLM_TIMEOUT_IN_MS = 3_500;
const CLEAR_PREFERENCES_PATTERN =
  /\b(?:clear|forget|reset)\s+(?:all\s+)?(?:my\s+)?(?:saved\s+)?preferences?\b/i;
const CONCISE_RESPONSE_STYLE_PATTERN =
  /\b(?:(?:concise|brief|short)\s+(?:answers?|responses?|replies?)|(?:answers?|responses?|replies?)\s+(?:concise|brief|short)|(?:answer|reply)\s+(?:briefly|concisely)|keep (?:the )?(?:answers?|responses?|replies?) (?:short|brief|concise))\b/i;
const DETAILED_RESPONSE_STYLE_PATTERN =
  /\b(?:(?:detailed|verbose|longer)\s+(?:answers?|responses?|replies?)|(?:answers?|responses?|replies?)\s+(?:detailed|verbose|longer)|(?:answer|reply)\s+(?:in detail|verbosely)|(?:more|extra)\s+detail)\b/i;
const PREFERENCE_RECALL_PATTERN =
  /\b(?:what do you remember about me|show (?:my )?preferences?|what are my preferences?|which preferences (?:do|did) you (?:remember|save))\b/i;

export const AI_AGENT_MEMORY_MAX_TURNS = 10;

function getLlmTimeoutInMs() {
  const parsed = Number.parseInt(process.env.AI_AGENT_LLM_TIMEOUT_IN_MS ?? '', 10);

  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_LLM_TIMEOUT_IN_MS;
}

function sanitizeUserPreferences(
  preferences?: AiAgentUserPreferenceState
): AiAgentUserPreferenceState {
  if (!preferences || typeof preferences !== 'object') {
    return {};
  }

  return {
    responseStyle:
      preferences.responseStyle === 'concise' || preferences.responseStyle === 'detailed'
        ? preferences.responseStyle
        : undefined,
    updatedAt:
      typeof preferences.updatedAt === 'string' ? preferences.updatedAt : undefined
  };
}

function hasStoredPreferences(preferences: AiAgentUserPreferenceState) {
  return Boolean(preferences.responseStyle);
}

function getResponseInstruction({
  userPreferences
}: {
  userPreferences?: AiAgentUserPreferenceState;
}) {
  if (userPreferences?.responseStyle === 'concise') {
    return `User preference: keep the response concise in 1-3 short sentences and avoid speculation.`;
  }

  if (userPreferences?.responseStyle === 'detailed') {
    return `User preference: provide a detailed structured response with clear steps and avoid speculation.`;
  }

  return `Write a concise response with actionable insight and avoid speculation.`;
}

export function isPreferenceRecallQuery(query: string) {
  return PREFERENCE_RECALL_PATTERN.test(query.trim().toLowerCase());
}

export function createPreferenceSummaryResponse({
  userPreferences
}: {
  userPreferences: AiAgentUserPreferenceState;
}) {
  if (!hasStoredPreferences(userPreferences)) {
    return 'I have no saved cross-session preferences yet.';
  }

  const sections: string[] = ['Saved cross-session preferences:'];

  if (userPreferences.responseStyle) {
    sections.push(`- response style: ${userPreferences.responseStyle}`);
  }

  return sections.join('\n');
}

export function resolvePreferenceUpdate({
  query,
  userPreferences
}: {
  query: string;
  userPreferences: AiAgentUserPreferenceState;
}): {
  acknowledgement?: string;
  shouldPersist: boolean;
  userPreferences: AiAgentUserPreferenceState;
} {
  const normalizedPreferences = sanitizeUserPreferences(userPreferences);
  const normalizedQuery = query.trim();

  if (CLEAR_PREFERENCES_PATTERN.test(normalizedQuery)) {
    return {
      acknowledgement: hasStoredPreferences(normalizedPreferences)
        ? 'Cleared your saved cross-session preferences.'
        : 'No saved cross-session preferences were found.',
      shouldPersist: hasStoredPreferences(normalizedPreferences),
      userPreferences: {}
    };
  }

  const wantsConcise = CONCISE_RESPONSE_STYLE_PATTERN.test(normalizedQuery);
  const wantsDetailed = DETAILED_RESPONSE_STYLE_PATTERN.test(normalizedQuery);

  if (wantsConcise === wantsDetailed) {
    return {
      shouldPersist: false,
      userPreferences: normalizedPreferences
    };
  }

  const responseStyle: AiAgentUserPreferenceState['responseStyle'] = wantsConcise
    ? 'concise'
    : 'detailed';

  if (normalizedPreferences.responseStyle === responseStyle) {
    return {
      acknowledgement: `Preference already saved: response style is ${responseStyle}.`,
      shouldPersist: false,
      userPreferences: normalizedPreferences
    };
  }

  return {
    acknowledgement: `Saved preference: I will keep responses ${responseStyle} across sessions.`,
    shouldPersist: true,
    userPreferences: {
      ...normalizedPreferences,
      responseStyle,
      updatedAt: new Date().toISOString()
    }
  };
}

export async function buildAnswer({
  generateText,
  languageCode,
  marketData,
  memory,
  portfolioAnalysis,
  query,
  rebalancePlan,
  riskAssessment,
  stressTest,
  userPreferences,
  userCurrency
}: {
  generateText: ({
    prompt,
    signal
  }: {
    prompt: string;
    signal?: AbortSignal;
  }) => Promise<{ text?: string }>;
  languageCode: string;
  marketData?: MarketDataLookupResult;
  memory: AiAgentMemoryState;
  portfolioAnalysis?: PortfolioAnalysisResult;
  query: string;
  rebalancePlan?: RebalancePlanResult;
  riskAssessment?: RiskAssessmentResult;
  stressTest?: StressTestResult;
  userPreferences?: AiAgentUserPreferenceState;
  userCurrency: string;
}) {
  const fallbackSections: string[] = [];
  const normalizedQuery = query.toLowerCase();
  const hasInvestmentIntent = [
    'add',
    'allocat',
    'buy',
    'invest',
    'next',
    'rebalanc',
    'sell',
    'trim'
  ].some((keyword) => {
    return normalizedQuery.includes(keyword);
  });

  if (memory.turns.length > 0) {
    fallbackSections.push(
      `Session memory applied from ${memory.turns.length} prior turn(s).`
    );
  }

  if (riskAssessment) {
    fallbackSections.push(
      `Risk concentration is ${riskAssessment.concentrationBand}. Top holding allocation is ${(riskAssessment.topHoldingAllocation * 100).toFixed(2)}% with HHI ${riskAssessment.hhi.toFixed(3)}.`
    );
  }

  if (rebalancePlan) {
    if (rebalancePlan.overweightHoldings.length > 0) {
      const topOverweight = rebalancePlan.overweightHoldings
        .slice(0, 2)
        .map(({ reductionNeeded, symbol }) => {
          return `${symbol} trim ${(reductionNeeded * 100).toFixed(1)}pp`;
        })
        .join(', ');

      fallbackSections.push(`Rebalance priority: ${topOverweight}.`);
    } else {
      fallbackSections.push(
        'Rebalance check: no holding exceeds the current max-allocation target.'
      );
    }
  }

  if (stressTest) {
    fallbackSections.push(
      `Stress test (${(stressTest.shockPercentage * 100).toFixed(0)}% downside): estimated drawdown ${stressTest.estimatedDrawdownInBaseCurrency.toFixed(2)} ${userCurrency}, projected value ${stressTest.estimatedPortfolioValueAfterShock.toFixed(2)} ${userCurrency}.`
    );
  }

  if (portfolioAnalysis?.holdings?.length > 0) {
    const longHoldings = portfolioAnalysis.holdings
      .filter(({ valueInBaseCurrency }) => {
        return valueInBaseCurrency > 0;
      })
      .sort((a, b) => {
        return b.valueInBaseCurrency - a.valueInBaseCurrency;
      });
    const totalLongValue = longHoldings.reduce((sum, { valueInBaseCurrency }) => {
      return sum + valueInBaseCurrency;
    }, 0);

    if (totalLongValue > 0) {
      const topLongHoldingsSummary = longHoldings
        .slice(0, 3)
        .map(({ symbol, valueInBaseCurrency }) => {
          return `${symbol} ${((valueInBaseCurrency / totalLongValue) * 100).toFixed(1)}%`;
        })
        .join(', ');

      fallbackSections.push(`Largest long allocations: ${topLongHoldingsSummary}.`);

      if (hasInvestmentIntent) {
        const topLongShare = longHoldings[0].valueInBaseCurrency / totalLongValue;

        if (topLongShare >= 0.35) {
          fallbackSections.push(
            'Next-step allocation: direct new capital to positions outside your top holding until concentration falls below 35%.'
          );
        } else {
          fallbackSections.push(
            'Next-step allocation: spread new capital across your smallest high-conviction positions to preserve diversification.'
          );
        }
      }
    }
  }

  if (marketData?.quotes?.length > 0) {
    const quoteSummary = marketData.quotes
      .slice(0, 3)
      .map(({ currency, marketPrice, symbol }) => {
        return `${symbol}: ${marketPrice.toFixed(2)} ${currency}`;
      })
      .join(', ');

    fallbackSections.push(`Market snapshot: ${quoteSummary}.`);
  } else if (marketData?.symbolsRequested?.length > 0) {
    fallbackSections.push(
      `Market data request completed with limited quote coverage for: ${marketData.symbolsRequested.join(', ')}.`
    );
  }

  if (fallbackSections.length === 0) {
    fallbackSections.push(
      `Portfolio context is available. Ask about holdings, risk concentration, or symbol prices for deeper analysis.`
    );
  }

  const fallbackAnswer = userPreferences?.responseStyle === 'concise'
    ? fallbackSections.slice(0, 2).join('\n')
    : fallbackSections.join('\n');
  const llmPrompt = [
    `You are a neutral financial assistant.`,
    `User currency: ${userCurrency}`,
    `Language code: ${languageCode}`,
    `Query: ${query}`,
    `Context summary:`,
    fallbackAnswer,
    getResponseInstruction({ userPreferences })
  ].join('\n');
  const llmTimeoutInMs = getLlmTimeoutInMs();
  const abortController = new AbortController();
  let timeoutId: NodeJS.Timeout | undefined;

  try {
    const generated = await Promise.race([
      generateText({
        prompt: llmPrompt,
        signal: abortController.signal
      }),
      new Promise<{ text?: string } | undefined>((resolve) => {
        timeoutId = setTimeout(() => {
          abortController.abort();
          resolve(undefined);
        }, llmTimeoutInMs);
        timeoutId.unref?.();
      })
    ]);

    const generatedAnswer = generated?.text?.trim();

    if (
      generatedAnswer &&
      isGeneratedAnswerReliable({
        answer: generatedAnswer,
        query
      })
    ) {
      return generatedAnswer;
    }
  } catch {}
  finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }

  return fallbackAnswer;
}

export async function getMemory({
  redisCacheService,
  sessionId,
  userId
}: {
  redisCacheService: RedisCacheService;
  sessionId: string;
  userId: string;
}): Promise<AiAgentMemoryState> {
  const rawMemory = await redisCacheService.get(
    getMemoryKey({ sessionId, userId })
  );

  if (!rawMemory) {
    return {
      turns: []
    };
  }

  try {
    const parsed = JSON.parse(rawMemory) as AiAgentMemoryState;

    if (!Array.isArray(parsed?.turns)) {
      return {
        turns: []
      };
    }

    return parsed;
  } catch {
    return {
      turns: []
    };
  }
}

export async function getUserPreferences({
  redisCacheService,
  userId
}: {
  redisCacheService: RedisCacheService;
  userId: string;
}): Promise<AiAgentUserPreferenceState> {
  const rawPreferences = await redisCacheService.get(
    getUserPreferencesKey({ userId })
  );

  if (!rawPreferences) {
    return {};
  }

  try {
    const parsed = JSON.parse(rawPreferences) as AiAgentUserPreferenceState;

    return sanitizeUserPreferences(parsed);
  } catch {
    return {};
  }
}

export function getMemoryKey({
  sessionId,
  userId
}: {
  sessionId: string;
  userId: string;
}) {
  return `ai-agent-memory-${userId}-${sessionId}`;
}

export function getUserPreferencesKey({ userId }: { userId: string }) {
  return `ai-agent-preferences-${userId}`;
}

export function resolveSymbols({
  portfolioAnalysis,
  query,
  symbols
}: {
  portfolioAnalysis?: PortfolioAnalysisResult;
  query: string;
  symbols?: string[];
}) {
  const explicitSymbols =
    symbols?.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean) ?? [];
  const extractedSymbols = extractSymbolsFromQuery(query);

  const derivedSymbols =
    portfolioAnalysis?.holdings.slice(0, 3).map(({ symbol }) => symbol) ?? [];

  return Array.from(
    new Set([...explicitSymbols, ...extractedSymbols, ...derivedSymbols])
  );
}

export async function runMarketDataLookup({
  dataProviderService,
  portfolioAnalysis,
  symbols
}: {
  dataProviderService: DataProviderService;
  portfolioAnalysis?: PortfolioAnalysisResult;
  symbols: string[];
}): Promise<MarketDataLookupResult> {
  const holdingsMap = new Map(
    (portfolioAnalysis?.holdings ?? []).map((holding) => {
      return [holding.symbol, holding];
    })
  );

  const quoteIdentifiers = symbols.map((symbol) => {
    const knownHolding = holdingsMap.get(symbol);

    return {
      dataSource: knownHolding?.dataSource ?? DataSource.YAHOO,
      symbol
    };
  });

  const quotesBySymbol =
    quoteIdentifiers.length > 0
      ? await dataProviderService.getQuotes({
          items: quoteIdentifiers
        })
      : {};

  return {
    quotes: symbols
      .filter((symbol) => Boolean(quotesBySymbol[symbol]))
      .map((symbol) => {
        return {
          currency: quotesBySymbol[symbol].currency,
          marketPrice: quotesBySymbol[symbol].marketPrice,
          marketState: quotesBySymbol[symbol].marketState,
          symbol
        };
      }),
    symbolsRequested: symbols
  };
}

export async function runPortfolioAnalysis({
  portfolioService,
  userId
}: {
  portfolioService: PortfolioService;
  userId: string;
}): Promise<PortfolioAnalysisResult> {
  const { holdings } = await portfolioService.getDetails({
    impersonationId: undefined,
    userId
  });
  const normalizedHoldings = Object.values(holdings)
    .map((holding) => {
      return {
        allocationInPercentage: holding.allocationInPercentage ?? 0,
        dataSource: holding.dataSource,
        symbol: holding.symbol,
        valueInBaseCurrency: holding.valueInBaseCurrency ?? 0
      };
    })
    .sort((a, b) => {
      return b.valueInBaseCurrency - a.valueInBaseCurrency;
    });

  const totalValueInBaseCurrency = normalizedHoldings.reduce(
    (totalValue, holding) => {
      return totalValue + holding.valueInBaseCurrency;
    },
    0
  );
  const allocationSum = normalizedHoldings.reduce((sum, holding) => {
    return sum + holding.allocationInPercentage;
  }, 0);

  return {
    allocationSum,
    holdings: normalizedHoldings,
    holdingsCount: normalizedHoldings.length,
    totalValueInBaseCurrency
  };
}

export function runRiskAssessment({
  portfolioAnalysis
}: {
  portfolioAnalysis: PortfolioAnalysisResult;
}): RiskAssessmentResult {
  const longExposureValues = portfolioAnalysis.holdings
    .map(({ valueInBaseCurrency }) => {
      return Math.max(valueInBaseCurrency, 0);
    })
    .filter((value) => value > 0);
  const totalLongExposure = longExposureValues.reduce((sum, value) => {
    return sum + value;
  }, 0);
  const allocations =
    totalLongExposure > 0
      ? longExposureValues.map((value) => {
          return value / totalLongExposure;
        })
      : portfolioAnalysis.holdings
          .map(({ allocationInPercentage }) => {
            return Math.max(allocationInPercentage, 0);
          })
          .filter((value) => value > 0);
  const topHoldingAllocation = allocations.length > 0 ? Math.max(...allocations) : 0;
  const hhi = allocations.reduce((sum, allocation) => {
    return sum + allocation * allocation;
  }, 0);

  let concentrationBand: RiskAssessmentResult['concentrationBand'] = 'low';

  if (topHoldingAllocation >= 0.35 || hhi >= 0.25) {
    concentrationBand = 'high';
  } else if (topHoldingAllocation >= 0.2 || hhi >= 0.15) {
    concentrationBand = 'medium';
  }

  return {
    concentrationBand,
    hhi,
    topHoldingAllocation
  };
}

export async function setMemory({
  memory,
  redisCacheService,
  sessionId,
  userId
}: {
  memory: AiAgentMemoryState;
  redisCacheService: RedisCacheService;
  sessionId: string;
  userId: string;
}) {
  await redisCacheService.set(
    getMemoryKey({ sessionId, userId }),
    JSON.stringify(memory),
    AI_AGENT_MEMORY_TTL
  );
}

export async function setUserPreferences({
  redisCacheService,
  userId,
  userPreferences
}: {
  redisCacheService: RedisCacheService;
  userId: string;
  userPreferences: AiAgentUserPreferenceState;
}) {
  await redisCacheService.set(
    getUserPreferencesKey({ userId }),
    JSON.stringify(sanitizeUserPreferences(userPreferences)),
    AI_AGENT_USER_PREFERENCES_TTL
  );
}
