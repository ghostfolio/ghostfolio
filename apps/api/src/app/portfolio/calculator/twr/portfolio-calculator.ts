import { PortfolioCalculator } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator';
import {
  AssetProfileIdentifier,
  SymbolMetrics
} from '@ghostfolio/common/interfaces';
import { PortfolioSnapshot } from '@ghostfolio/common/models';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

export class TwrPortfolioCalculator extends PortfolioCalculator {
  protected calculateOverallPerformance(): PortfolioSnapshot {
    throw new Error('Method not implemented.');
  }

  protected getPerformanceCalculationType() {
    return PerformanceCalculationType.TWR;
  }

  protected getSymbolMetrics({}: {
    end: Date;
    exchangeRates: { [dateString: string]: number };
    marketSymbolMap: {
      [date: string]: { [symbol: string]: Big };
    };
    start: Date;
    step?: number;
  } & AssetProfileIdentifier): SymbolMetrics {
    throw new Error('Method not implemented.');
  }
}
