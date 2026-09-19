import { PortfolioCalculator } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator';
import { HoldingPerformance } from '@ghostfolio/api/app/portfolio/interfaces/holding-performance.interface';
import { PortfolioCalculatorHolding } from '@ghostfolio/api/app/portfolio/interfaces/portfolio-calculator-holding.interface';
import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';
import { PortfolioSnapshot } from '@ghostfolio/common/models';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

export class RoiPortfolioCalculator extends PortfolioCalculator {
  protected calculateOverallPerformance([]: PortfolioCalculatorHolding[]): PortfolioSnapshot {
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
    return PerformanceCalculationType.ROI;
  }
}
