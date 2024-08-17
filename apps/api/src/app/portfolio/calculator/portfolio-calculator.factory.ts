import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { HistoricalDataItem } from '@ghostfolio/common/interfaces';

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
    private readonly configurationService: ConfigurationService,
    private readonly currentRateService: CurrentRateService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly redisCacheService: RedisCacheService
  ) {}

  public createCalculator({
    accountBalanceItems = [],
    activities,
    calculationType,
    currency,
    hasFilters,
    isExperimentalFeatures = false,
    userId
  }: {
    accountBalanceItems?: HistoricalDataItem[];
    activities: Activity[];
    calculationType: PerformanceCalculationType;
    currency: string;
    hasFilters: boolean;
    isExperimentalFeatures?: boolean;
    userId: string;
  }): PortfolioCalculator {
    const useCache = !hasFilters && isExperimentalFeatures;

    switch (calculationType) {
      case PerformanceCalculationType.MWR:
        return new MWRPortfolioCalculator({
          accountBalanceItems,
          activities,
          currency,
          useCache,
          userId,
          configurationService: this.configurationService,
          currentRateService: this.currentRateService,
          exchangeRateDataService: this.exchangeRateDataService,
          redisCacheService: this.redisCacheService
        });
      case PerformanceCalculationType.TWR:
        return new TWRPortfolioCalculator({
          accountBalanceItems,
          activities,
          currency,
          currentRateService: this.currentRateService,
          useCache,
          userId,
          configurationService: this.configurationService,
          exchangeRateDataService: this.exchangeRateDataService,
          redisCacheService: this.redisCacheService
        });
      default:
        throw new Error('Invalid calculation type');
    }
  }
}
