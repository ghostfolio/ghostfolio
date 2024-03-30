import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';

import { Injectable } from '@nestjs/common';

import { MWRPortfolioCalculator } from './mwr/portfolio-calculator';
import { PortfolioCalculator } from './portfolio-calculator';
import { TWRPortfolioCalculator } from './twr/portfolio-calculator';

export enum PerformanceCalculationType {
  TWR = 'TWR', // Time-Weighted Rate of Return
  MWR = 'MWR' // Money-Weighted Rate of Return
}

@Injectable()
export class PortfolioCalculatorFactory {
  constructor(
    private readonly currentRateService: CurrentRateService,
    private readonly exchangeRateDataService: ExchangeRateDataService
  ) {}

  createCalculator({
    calculationType,
    activities,
    currency
  }: {
    calculationType: PerformanceCalculationType;
    activities: Activity[];
    currency: string;
  }): PortfolioCalculator {
    switch (calculationType) {
      case PerformanceCalculationType.TWR:
        return new TWRPortfolioCalculator({
          activities,
          currency,
          currentRateService: this.currentRateService,
          exchangeRateDataService: this.exchangeRateDataService
        });
      case PerformanceCalculationType.MWR:
        return new MWRPortfolioCalculator({
          activities,
          currency,
          currentRateService: this.currentRateService,
          exchangeRateDataService: this.exchangeRateDataService
        });
      default:
        throw new Error('Invalid calculation type');
    }
  }
}
