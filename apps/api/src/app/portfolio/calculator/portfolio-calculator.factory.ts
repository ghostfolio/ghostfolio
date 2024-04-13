import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { DateRange } from '@ghostfolio/common/types';

import { Injectable } from '@nestjs/common';

import { MWRPortfolioCalculator } from './mwr/portfolio-calculator';
import { PortfolioCalculator } from './portfolio-calculator';
import { TWRPortfolioCalculator } from './twr/portfolio-calculator';

export enum PerformanceCalculationType {
  MWR = 'MWR', // Money-Weighted Rate of Return
  TWR = 'TWR' // Time-Weighted Rate of Return
}

@Injectable()
export class PortfolioCalculatorFactory {
  public constructor(
    private readonly currentRateService: CurrentRateService,
    private readonly exchangeRateDataService: ExchangeRateDataService
  ) {}

  public createCalculator({
    activities,
    calculationType,
    currency,
    dateRange = 'max'
  }: {
    activities: Activity[];
    calculationType: PerformanceCalculationType;
    currency: string;
    dateRange?: DateRange;
  }): PortfolioCalculator {
    switch (calculationType) {
      case PerformanceCalculationType.MWR:
        return new MWRPortfolioCalculator({
          activities,
          currency,
          dateRange,
          currentRateService: this.currentRateService,
          exchangeRateDataService: this.exchangeRateDataService
        });
      case PerformanceCalculationType.TWR:
        return new TWRPortfolioCalculator({
          activities,
          currency,
          currentRateService: this.currentRateService,
          dateRange,
          exchangeRateDataService: this.exchangeRateDataService
        });
      default:
        throw new Error('Invalid calculation type');
    }
  }
}
