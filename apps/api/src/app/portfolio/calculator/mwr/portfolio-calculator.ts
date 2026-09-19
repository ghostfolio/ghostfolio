import { PortfolioCalculator } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator';
import { HoldingPerformance } from '@ghostfolio/api/app/portfolio/interfaces/holding-performance.interface';
import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';
import { PortfolioSnapshot } from '@ghostfolio/common/models';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

export class MwrPortfolioCalculator extends PortfolioCalculator {
  protected calculateOverallPerformance(): PortfolioSnapshot {
    throw new Error('Method not implemented.');
  }

  protected getHoldingPerformance({}: {
    chartDateMap: { [date: string]: boolean };
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
    return PerformanceCalculationType.MWR;
  }
}
