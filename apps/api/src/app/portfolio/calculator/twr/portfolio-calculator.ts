import { PortfolioCalculator } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator';
import { AccumulatedValues } from '@ghostfolio/api/app/portfolio/interfaces/accumulated-values.interface';
import { HoldingPerformance } from '@ghostfolio/api/app/portfolio/interfaces/holding-performance.interface';
import { NetPerformancePercentages } from '@ghostfolio/api/app/portfolio/interfaces/net-performance-percentages.interface';
import {
  AssetProfileIdentifier,
  HistoricalDataItem
} from '@ghostfolio/common/interfaces';
import { PortfolioSnapshot } from '@ghostfolio/common/models';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

export class TwrPortfolioCalculator extends PortfolioCalculator {
  protected calculateNetPerformancePercentages({}: {
    accumulatedValuesByDate: { [date: string]: AccumulatedValues };
  }): { [date: string]: NetPerformancePercentages } {
    throw new Error('Method not implemented.');
  }

  protected calculateNetPerformancePercentagesForDateRange({}: {
    historicalDataItems: HistoricalDataItem[];
  }): { [date: string]: NetPerformancePercentages } {
    throw new Error('Method not implemented.');
  }

  protected calculateOverallPerformance(): PortfolioSnapshot {
    throw new Error('Method not implemented.');
  }

  protected getHoldingPerformance({}: {
    chartDates: string[];
    end: Date;
    exchangeRates: { [dateString: string]: number };
    marketSymbolMap: {
      [date: string]: { [assetProfileIdentifier: string]: Big };
    };
    start: Date;
  } & AssetProfileIdentifier): HoldingPerformance {
    throw new Error('Method not implemented.');
  }

  protected getPerformanceCalculationType() {
    return PerformanceCalculationType.TWR;
  }
}
