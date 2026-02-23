import { PortfolioService } from '@ghostfolio/api/app/portfolio/portfolio.service';
import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';

import { DataSource } from '@prisma/client';
import ms from 'ms';

import {
  AiAgentToolCall,
  AiAgentVerificationCheck
} from './ai-agent.interfaces';
import {
  AiAgentMemoryState,
  MarketDataLookupResult,
  PortfolioAnalysisResult,
  RebalancePlanResult,
  RiskAssessmentResult,
  StressTestResult
} from './ai-agent.chat.interfaces';
import { extractSymbolsFromQuery } from './ai-agent.utils';

const AI_AGENT_MEMORY_TTL = ms('24 hours');

export const AI_AGENT_MEMORY_MAX_TURNS = 10;

export function addVerificationChecks({
  marketData,
  portfolioAnalysis,
  rebalancePlan,
  stressTest,
  toolCalls,
  verification
}: {
  marketData?: MarketDataLookupResult;
  portfolioAnalysis?: PortfolioAnalysisResult;
  rebalancePlan?: RebalancePlanResult;
  stressTest?: StressTestResult;
  toolCalls: AiAgentToolCall[];
  verification: AiAgentVerificationCheck[];
}) {
  if (portfolioAnalysis) {
    const allocationDifference = Math.abs(portfolioAnalysis.allocationSum - 1);

    verification.push({
      check: 'numerical_consistency',
      details:
        allocationDifference <= 0.05
          ? `Allocation sum difference is ${allocationDifference.toFixed(4)}`
          : `Allocation sum difference is ${allocationDifference.toFixed(4)} (can happen with liabilities or leveraged exposure)`,
      status: allocationDifference <= 0.05 ? 'passed' : 'warning'
    });
  } else {
    verification.push({
      check: 'numerical_consistency',
      details: 'Portfolio tool did not run',
      status: 'warning'
    });
  }

  if (marketData) {
    const unresolvedSymbols = marketData.symbolsRequested.length -
      marketData.quotes.length;

    verification.push({
      check: 'market_data_coverage',
      details:
        unresolvedSymbols > 0
          ? `${unresolvedSymbols} symbols did not resolve with quote data`
          : 'All requested symbols resolved with quote data',
      status:
        unresolvedSymbols === 0
          ? 'passed'
          : marketData.quotes.length > 0
            ? 'warning'
            : 'failed'
    });
  }

  if (rebalancePlan) {
    verification.push({
      check: 'rebalance_coverage',
      details:
        rebalancePlan.overweightHoldings.length > 0 ||
        rebalancePlan.underweightHoldings.length > 0
          ? `Rebalance plan found ${rebalancePlan.overweightHoldings.length} overweight and ${rebalancePlan.underweightHoldings.length} underweight holdings`
          : 'No rebalance action identified from current holdings',
      status:
        rebalancePlan.overweightHoldings.length > 0 ||
        rebalancePlan.underweightHoldings.length > 0
          ? 'passed'
          : 'warning'
    });
  }

  if (stressTest) {
    verification.push({
      check: 'stress_test_coherence',
      details: `Shock ${(stressTest.shockPercentage * 100).toFixed(1)}% implies drawdown ${stressTest.estimatedDrawdownInBaseCurrency.toFixed(2)}`,
      status:
        stressTest.estimatedDrawdownInBaseCurrency >= 0 &&
        stressTest.estimatedPortfolioValueAfterShock >= 0
          ? 'passed'
          : 'failed'
    });
  }

  verification.push({
    check: 'tool_execution',
    details: `${toolCalls.filter(({ status }) => {
      return status === 'success';
    }).length}/${toolCalls.length} tools executed successfully`,
    status: toolCalls.every(({ status }) => status === 'success')
      ? 'passed'
      : 'warning'
  });
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
  userCurrency
}: {
  generateText: ({ prompt }: { prompt: string }) => Promise<{ text?: string }>;
  languageCode: string;
  marketData?: MarketDataLookupResult;
  memory: AiAgentMemoryState;
  portfolioAnalysis?: PortfolioAnalysisResult;
  query: string;
  rebalancePlan?: RebalancePlanResult;
  riskAssessment?: RiskAssessmentResult;
  stressTest?: StressTestResult;
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

  const fallbackAnswer = fallbackSections.join('\n');
  const llmPrompt = [
    `You are a neutral financial assistant.`,
    `User currency: ${userCurrency}`,
    `Language code: ${languageCode}`,
    `Query: ${query}`,
    `Context summary:`,
    fallbackAnswer,
    `Write a concise response with actionable insight and avoid speculation.`
  ].join('\n');

  try {
    const generated = await generateText({
      prompt: llmPrompt
    });

    if (generated?.text?.trim()) {
      return generated.text.trim();
    }
  } catch {}

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

export function getMemoryKey({
  sessionId,
  userId
}: {
  sessionId: string;
  userId: string;
}) {
  return `ai-agent-memory-${userId}-${sessionId}`;
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
