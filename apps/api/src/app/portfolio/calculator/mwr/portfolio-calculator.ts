import { PortfolioCalculator } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator';
import {
  AssetProfileIdentifier,
  SymbolMetrics
} from '@ghostfolio/common/interfaces';
import { PortfolioSnapshot } from '@ghostfolio/common/models';

export class MWRPortfolioCalculator extends PortfolioCalculator {
  protected calculateOverallPerformance(): PortfolioSnapshot {
    throw new Error('Method not implemented.');
  }

  protected getSymbolMetrics({}: {
    end: Date;
    exchangeRates: Record<string, number>;
    marketSymbolMap: Record<string, Record<string, Big>>;
    start: Date;
    step?: number;
  } & AssetProfileIdentifier): SymbolMetrics {
    throw new Error('Method not implemented.');
  }
}
