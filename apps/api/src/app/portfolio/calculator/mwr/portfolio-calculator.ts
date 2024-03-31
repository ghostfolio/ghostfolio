import { PortfolioCalculator } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator';
import { CurrentPositions } from '@ghostfolio/api/app/portfolio/interfaces/current-positions.interface';
import {
  SymbolMetrics,
  TimelinePosition,
  UniqueAsset
} from '@ghostfolio/common/interfaces';

export class MWRPortfolioCalculator extends PortfolioCalculator {
  protected calculateOverallPerformance(
    positions: TimelinePosition[]
  ): CurrentPositions {
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
