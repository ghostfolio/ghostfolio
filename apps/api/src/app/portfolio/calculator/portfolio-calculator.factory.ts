import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { PortfolioSnapshotService } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service';
import { Filter, HistoricalDataItem } from '@ghostfolio/common/interfaces';

import { Injectable } from '@nestjs/common';

import { MWRPortfolioCalculator } from './mwr/portfolio-calculator';
import { PortfolioCalculator } from './portfolio-calculator';
import { RoaiPortfolioCalculator } from './roai/portfolio-calculator';

export enum PerformanceCalculationType {
  MWR = 'MWR', // Money-Weighted Rate of Return
  ROAI = 'ROAI' // Return on Average Investment
}

@Injectable()
export class PortfolioCalculatorFactory {
  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly currentRateService: CurrentRateService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly portfolioSnapshotService: PortfolioSnapshotService,
    private readonly redisCacheService: RedisCacheService
  ) {}

  public createCalculator({
    accountBalanceItems = [],
    activities,
    calculationType,
    currency,
    filters = [],
    userId
  }: {
    accountBalanceItems?: HistoricalDataItem[];
    activities: Activity[];
    calculationType: PerformanceCalculationType;
    currency: string;
    filters?: Filter[];
    userId: string;
  }): PortfolioCalculator {
    switch (calculationType) {
      case PerformanceCalculationType.MWR:
        return new MWRPortfolioCalculator({
          accountBalanceItems,
          activities,
          currency,
          filters,
          userId,
          configurationService: this.configurationService,
          currentRateService: this.currentRateService,
          exchangeRateDataService: this.exchangeRateDataService,
          portfolioSnapshotService: this.portfolioSnapshotService,
          redisCacheService: this.redisCacheService
        });
      case PerformanceCalculationType.ROAI:
        return new RoaiPortfolioCalculator({
          accountBalanceItems,
          activities,
          currency,
          currentRateService: this.currentRateService,
          filters,
          userId,
          configurationService: this.configurationService,
          exchangeRateDataService: this.exchangeRateDataService,
          portfolioSnapshotService: this.portfolioSnapshotService,
          redisCacheService: this.redisCacheService
        });
      default:
        throw new Error('Invalid calculation type');
    }
  }
}
