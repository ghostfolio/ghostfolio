import {
  PortfolioAnalysisResult,
  RebalancePlanResult,
  StressTestResult
} from './ai-agent.chat.interfaces';

export function runRebalancePlan({
  maxAllocationTarget = 0.35,
  portfolioAnalysis
}: {
  maxAllocationTarget?: number;
  portfolioAnalysis: PortfolioAnalysisResult;
}): RebalancePlanResult {
  const longExposure = portfolioAnalysis.holdings
    .filter(({ valueInBaseCurrency }) => {
      return valueInBaseCurrency > 0;
    })
    .sort((a, b) => {
      return b.valueInBaseCurrency - a.valueInBaseCurrency;
    });
  const totalLongExposure = longExposure.reduce((sum, { valueInBaseCurrency }) => {
    return sum + valueInBaseCurrency;
  }, 0);

  if (totalLongExposure === 0) {
    return {
      maxAllocationTarget,
      overweightHoldings: [],
      underweightHoldings: []
    };
  }

  const withLongAllocation = longExposure.map(({ symbol, valueInBaseCurrency }) => {
    return {
      currentAllocation: valueInBaseCurrency / totalLongExposure,
      symbol
    };
  });

  return {
    maxAllocationTarget,
    overweightHoldings: withLongAllocation
      .filter(({ currentAllocation }) => {
        return currentAllocation > maxAllocationTarget;
      })
      .map(({ currentAllocation, symbol }) => {
        return {
          currentAllocation,
          reductionNeeded: currentAllocation - maxAllocationTarget,
          symbol
        };
      }),
    underweightHoldings: withLongAllocation
      .filter(({ currentAllocation }) => {
        return currentAllocation < maxAllocationTarget * 0.5;
      })
      .slice(-3)
  };
}

export function runStressTest({
  portfolioAnalysis,
  shockPercentage = 0.1
}: {
  portfolioAnalysis: PortfolioAnalysisResult;
  shockPercentage?: number;
}): StressTestResult {
  const boundedShock = Math.min(Math.max(shockPercentage, 0), 0.8);
  const longExposureInBaseCurrency = portfolioAnalysis.holdings.reduce(
    (sum, { valueInBaseCurrency }) => {
      return sum + Math.max(valueInBaseCurrency, 0);
    },
    0
  );
  const estimatedDrawdownInBaseCurrency = longExposureInBaseCurrency * boundedShock;

  return {
    estimatedDrawdownInBaseCurrency,
    estimatedPortfolioValueAfterShock:
      portfolioAnalysis.totalValueInBaseCurrency - estimatedDrawdownInBaseCurrency,
    longExposureInBaseCurrency,
    shockPercentage: boundedShock
  };
}
