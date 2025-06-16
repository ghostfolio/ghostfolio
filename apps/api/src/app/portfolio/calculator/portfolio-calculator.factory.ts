import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { LogPerformance } from '@ghostfolio/api/interceptors/performance-logging/performance-logging.interceptor';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { PortfolioSnapshotService } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service';
import { Filter, HistoricalDataItem } from '@ghostfolio/common/interfaces';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

import { Injectable } from '@nestjs/common';

import { OrderService } from '../../order/order.service';
import { MwrPortfolioCalculator } from './mwr/portfolio-calculator';
import { PortfolioCalculator } from './portfolio-calculator';
import { RoaiPortfolioCalculator } from './roai/portfolio-calculator';
// import { RoaiPortfolioCalculator } from './roai/portfolio-calculator';
import { RoiPortfolioCalculator } from './roi/portfolio-calculator';
import { TwrPortfolioCalculator } from './twr/portfolio-calculator';

@Injectable()
export class PortfolioCalculatorFactory {
  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly currentRateService: CurrentRateService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly portfolioSnapshotService: PortfolioSnapshotService,
    private readonly redisCacheService: RedisCacheService,
    private readonly orderService: OrderService
  ) {}

  @LogPerformance
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
        return new MwrPortfolioCalculator({
          accountBalanceItems,
          activities,
          currency,
          filters,
          userId,
          configurationService: this.configurationService,
          currentRateService: this.currentRateService,
          exchangeRateDataService: this.exchangeRateDataService,
          portfolioSnapshotService: this.portfolioSnapshotService,
          redisCacheService: this.redisCacheService,
          orderService: this.orderService
        });

      case PerformanceCalculationType.ROAI:
        return new RoaiPortfolioCalculator({
          accountBalanceItems,
          activities,
          currency,
          filters,
          userId,
          configurationService: this.configurationService,
          currentRateService: this.currentRateService,
          exchangeRateDataService: this.exchangeRateDataService,
          portfolioSnapshotService: this.portfolioSnapshotService,
          redisCacheService: this.redisCacheService,
          orderService: this.orderService
        });

      case PerformanceCalculationType.ROI:
        return new RoiPortfolioCalculator({
          accountBalanceItems,
          activities,
          currency,
          filters,
          userId,
          configurationService: this.configurationService,
          currentRateService: this.currentRateService,
          exchangeRateDataService: this.exchangeRateDataService,
          portfolioSnapshotService: this.portfolioSnapshotService,
          redisCacheService: this.redisCacheService,
          orderService: this.orderService
        });

      case PerformanceCalculationType.TWR:
        return new TwrPortfolioCalculator({
          accountBalanceItems,
          activities,
          currency,
          currentRateService: this.currentRateService,
          userId,
          configurationService: this.configurationService,
          exchangeRateDataService: this.exchangeRateDataService,
          portfolioSnapshotService: this.portfolioSnapshotService,
          redisCacheService: this.redisCacheService,
          orderService: this.orderService,
          filters
        });

      default:
        throw new Error('Invalid calculation type');
    }
  }
}
