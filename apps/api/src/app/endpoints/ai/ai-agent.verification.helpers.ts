import {
  AiAgentToolCall,
  AiAgentVerificationCheck
} from './ai-agent.interfaces';
import {
  MarketDataLookupResult,
  PortfolioAnalysisResult,
  RebalancePlanResult,
  StressTestResult
} from './ai-agent.chat.interfaces';

export function addVerificationChecks({
  marketData,
  portfolioAnalysis,
  portfolioAnalysisExpected = true,
  rebalancePlan,
  stressTest,
  toolCalls,
  verification
}: {
  marketData?: MarketDataLookupResult;
  portfolioAnalysis?: PortfolioAnalysisResult;
  portfolioAnalysisExpected?: boolean;
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
  } else if (portfolioAnalysisExpected) {
    verification.push({
      check: 'numerical_consistency',
      details: 'Portfolio tool did not run',
      status: 'warning'
    });
  } else {
    verification.push({
      check: 'numerical_consistency',
      details: 'Portfolio tool was not required for the selected policy route',
      status: 'passed'
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
