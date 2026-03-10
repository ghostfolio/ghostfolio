import { AccountBalanceModule } from '@ghostfolio/api/app/account-balance/account-balance.module';
import { ActivitiesModule } from '@ghostfolio/api/app/activities/activities.module';
import { PortfolioCalculatorFactory } from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator.factory';
import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { RedisCacheModule } from '@ghostfolio/api/app/redis-cache/redis-cache.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { DataProviderModule } from '@ghostfolio/api/services/data-provider/data-provider.module';
import { ExchangeRateDataModule } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.module';
import { MarketDataModule } from '@ghostfolio/api/services/market-data/market-data.module';
import { PortfolioSnapshotService } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service';
import {
  DEFAULT_PROCESSOR_PORTFOLIO_SNAPSHOT_COMPUTATION_TIMEOUT,
  PORTFOLIO_SNAPSHOT_COMPUTATION_QUEUE
} from '@ghostfolio/common/config';

import { BullAdapter } from '@bull-board/api/bullAdapter';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';

import { PortfolioSnapshotProcessor } from './portfolio-snapshot.processor';

@Module({
  exports: [BullModule, PortfolioSnapshotService],
  imports: [
    AccountBalanceModule,
    ActivitiesModule,
    ...(process.env.ENABLE_FEATURE_BULL_BOARD === 'true'
      ? [
          BullBoardModule.forFeature({
            adapter: BullAdapter,
            name: PORTFOLIO_SNAPSHOT_COMPUTATION_QUEUE,
            options: {
              displayName: 'Portfolio Snapshot Computation',
              readOnlyMode: process.env.BULL_BOARD_IS_READ_ONLY !== 'false'
            }
          })
        ]
      : []),
    BullModule.registerQueue({
      name: PORTFOLIO_SNAPSHOT_COMPUTATION_QUEUE,
      settings: {
        lockDuration: parseInt(
          process.env.PROCESSOR_PORTFOLIO_SNAPSHOT_COMPUTATION_TIMEOUT ??
            DEFAULT_PROCESSOR_PORTFOLIO_SNAPSHOT_COMPUTATION_TIMEOUT.toString(),
          10
        )
      }
    }),
    ConfigurationModule,
    DataProviderModule,
    ExchangeRateDataModule,
    MarketDataModule,
    RedisCacheModule
  ],
  providers: [
    CurrentRateService,
    PortfolioCalculatorFactory,
    PortfolioSnapshotProcessor,
    PortfolioSnapshotService
  ]
})
export class PortfolioSnapshotQueueModule {}
