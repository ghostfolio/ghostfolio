import { HoldingPerformance } from '@ghostfolio/api/app/portfolio/interfaces/holding-performance.interface';
import { HoldingValuation } from '@ghostfolio/api/app/portfolio/interfaces/holding-valuation.interface';
import { PortfolioCalculatorActivityItem } from '@ghostfolio/api/app/portfolio/interfaces/portfolio-calculator-activity-item.interface';

import { Big } from 'big.js';

export type HoldingValuationOfPeriod =
  | {
      hasMarketPrices: false;
      holdingPerformance: HoldingPerformance;
    }
  | {
      activities: PortfolioCalculatorActivityItem[];
      dateOfFirstActivity: Date;
      hasMarketPrices: true;
      holdingValuation: HoldingValuation;
      totalDividend: Big;
      totalDividendInBaseCurrency: Big;
      totalInterestInBaseCurrency: Big;
      totalLiabilitiesInBaseCurrency: Big;
      unitPriceAtEndDate: Big;
    };
