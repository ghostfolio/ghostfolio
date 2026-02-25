import type { PortfolioPosition, PortfolioSummary } from '@ghostfolio/common/interfaces';

import { Injectable } from '@nestjs/common';

import type { AgentTool, AgentToolContext } from './agent-tool.interface';

interface PortfolioAnalysisOutput {
  summary: PortfolioSummary | undefined;
  topHoldings: Array<{
    allocationInPercentage: number;
    name: string;
    symbol: string;
    valueInBaseCurrency?: number;
  }>;
  totalPositions: number;
}

@Injectable()
export class PortfolioAnalysisTool implements AgentTool<PortfolioAnalysisOutput> {
  public readonly name = 'portfolio_analysis' as const;

  public async execute({
    portfolioDetails
  }: AgentToolContext): Promise<PortfolioAnalysisOutput> {
    const holdings = Object.values(portfolioDetails.holdings ?? {});
    const topHoldings = this.sortByAllocationDesc(holdings).slice(0, 5).map(
      ({ allocationInPercentage, name, symbol, valueInBaseCurrency }) => ({
        allocationInPercentage,
        name,
        symbol,
        valueInBaseCurrency
      })
    );

    return {
      summary: portfolioDetails.summary,
      topHoldings,
      totalPositions: holdings.length
    };
  }

  private sortByAllocationDesc(holdings: PortfolioPosition[]) {
    return [...holdings].sort((a, b) => {
      return b.allocationInPercentage - a.allocationInPercentage;
    });
  }
}
