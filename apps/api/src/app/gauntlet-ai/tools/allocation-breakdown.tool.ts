import type { PortfolioPosition } from '@ghostfolio/common/interfaces';

import { Injectable } from '@nestjs/common';

import type { AgentTool, AgentToolContext } from './agent-tool.interface';

interface AllocationBreakdownItem {
  key: string;
  percentage: number;
}

interface AllocationBreakdownOutput {
  assets: AllocationBreakdownItem[];
  sectors: AllocationBreakdownItem[];
}

@Injectable()
export class AllocationBreakdownTool
  implements AgentTool<AllocationBreakdownOutput>
{
  public readonly name = 'allocation_breakdown' as const;

  public async execute({
    portfolioDetails
  }: AgentToolContext): Promise<AllocationBreakdownOutput> {
    const holdings = Object.values(portfolioDetails.holdings ?? {});

    return {
      assets: this.buildAssetsBreakdown(holdings),
      sectors: this.buildSectorsBreakdown(holdings)
    };
  }

  private buildAssetsBreakdown(
    holdings: PortfolioPosition[]
  ): AllocationBreakdownItem[] {
    const byAsset = new Map<string, number>();

    for (const holding of holdings) {
      const key = this.getReadableAssetKey(holding);
      byAsset.set(
        key,
        (byAsset.get(key) ?? 0) + (holding.allocationInPercentage ?? 0)
      );
    }

    return this.toSortedItems(byAsset);
  }

  private buildSectorsBreakdown(
    holdings: PortfolioPosition[]
  ): AllocationBreakdownItem[] {
    const bySector = new Map<string, number>();

    for (const holding of holdings) {
      const holdingAllocation = holding.allocationInPercentage ?? 0;
      const sectors = holding.sectors ?? [];

      if (sectors.length === 0) {
        bySector.set('Unknown', (bySector.get('Unknown') ?? 0) + holdingAllocation);
        continue;
      }

      for (const sector of sectors) {
        bySector.set(
          sector.name,
          (bySector.get(sector.name) ?? 0) + holdingAllocation * sector.weight
        );
      }
    }

    return this.toSortedItems(bySector);
  }

  private toSortedItems(values: Map<string, number>): AllocationBreakdownItem[] {
    return [...values.entries()]
      .map(([key, percentage]) => ({ key, percentage }))
      .sort((a, b) => b.percentage - a.percentage);
  }

  private getReadableAssetKey(holding: PortfolioPosition): string {
    const name = holding.name?.trim();
    if (name) {
      return name;
    }

    return holding.symbol;
  }
}
