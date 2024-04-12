import { PortfolioCalculator } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator';
import { PortfolioSnapshot } from '@ghostfolio/api/app/portfolio/interfaces/portfolio-snapshot.interface';
import {
  SymbolMetrics,
  TimelinePosition,
  UniqueAsset
} from '@ghostfolio/common/interfaces';

export class MWRPortfolioCalculator extends PortfolioCalculator {
  protected calculateOverallPerformance(
    positions: TimelinePosition[]
  ): PortfolioSnapshot {
    throw new Error('Method not implemented.');
  }

  protected getSymbolMetrics({
    dataSource,
    end,
    exchangeRates,
    isChartMode = false,
    marketSymbolMap,
    start,
    step = 1,
    symbol
  }: {
    end: Date;
    exchangeRates: { [dateString: string]: number };
    isChartMode?: boolean;
    marketSymbolMap: {
      [date: string]: { [symbol: string]: Big };
    };
    start: Date;
    step?: number;
  } & UniqueAsset): SymbolMetrics {
    throw new Error('Method not implemented.');
  }
}
