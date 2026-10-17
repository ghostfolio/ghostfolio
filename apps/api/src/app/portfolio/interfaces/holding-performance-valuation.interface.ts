import { Big } from 'big.js';

import { DateRangeInterval } from './date-range-interval.interface';
import { HoldingValuation } from './holding-valuation.interface';
import { PortfolioCalculatorActivityItem } from './portfolio-calculator-activity-item.interface';

export interface HoldingPerformanceValuation extends HoldingValuation {
  activities: PortfolioCalculatorActivityItem[];
  dateRanges: DateRangeInterval[];
  daysInMarket: number;
  indexOfEndActivity: number;
  indexOfStartActivity: number;
  unitPriceAtEndDate: Big;
}
