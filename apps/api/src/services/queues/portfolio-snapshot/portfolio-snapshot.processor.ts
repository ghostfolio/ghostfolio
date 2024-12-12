import { AccountBalanceService } from '@ghostfolio/api/app/account-balance/account-balance.service';
import { OrderService } from '@ghostfolio/api/app/order/order.service';
import {
  PerformanceCalculationType,
  PortfolioCalculatorFactory
} from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator.factory';
import { PortfolioSnapshotValue } from '@ghostfolio/api/app/portfolio/interfaces/snapshot-value.interface';
import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import {
  CACHE_TTL_INFINITE,
  DEFAULT_PROCESSOR_PORTFOLIO_SNAPSHOT_COMPUTATION_CONCURRENCY,
  PORTFOLIO_SNAPSHOT_PROCESS_JOB_NAME,
  PORTFOLIO_SNAPSHOT_COMPUTATION_QUEUE
} from '@ghostfolio/common/config';

import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { addMilliseconds } from 'date-fns';

import { IPortfolioSnapshotQueueJob } from './interfaces/portfolio-snapshot-queue-job.interface';

@Injectable()
@Processor(PORTFOLIO_SNAPSHOT_COMPUTATION_QUEUE)
export class PortfolioSnapshotProcessor {
  public constructor(
    private readonly accountBalanceService: AccountBalanceService,
    private readonly calculatorFactory: PortfolioCalculatorFactory,
    private readonly configurationService: ConfigurationService,
    private readonly orderService: OrderService,
    private readonly redisCacheService: RedisCacheService
  ) {}

  @Process({
    concurrency: parseInt(
      process.env.PROCESSOR_PORTFOLIO_SNAPSHOT_COMPUTATION_CONCURRENCY ??
        DEFAULT_PROCESSOR_PORTFOLIO_SNAPSHOT_COMPUTATION_CONCURRENCY.toString(),
      10
    ),
    name: PORTFOLIO_SNAPSHOT_PROCESS_JOB_NAME
  })
  public async calculatePortfolioSnapshot(
    job: Job<IPortfolioSnapshotQueueJob>
  ) {
    try {
      const startTime = performance.now();

      Logger.log(
        `Portfolio snapshot calculation of user '${job.data.userId}' has been started`,
        `PortfolioSnapshotProcessor (${PORTFOLIO_SNAPSHOT_PROCESS_JOB_NAME})`
      );

      const { activities } =
        await this.orderService.getOrdersForPortfolioCalculator({
          filters: job.data.filters,
          userCurrency: job.data.userCurrency,
          userId: job.data.userId
        });

      const accountBalanceItems =
        await this.accountBalanceService.getAccountBalanceItems({
          filters: job.data.filters,
          userCurrency: job.data.userCurrency,
          userId: job.data.userId
        });

      const portfolioCalculator = this.calculatorFactory.createCalculator({
        accountBalanceItems,
        activities,
        calculationType: PerformanceCalculationType.TWR,
        currency: job.data.userCurrency,
        filters: job.data.filters,
        userId: job.data.userId
      });

      const snapshot = await portfolioCalculator.computeSnapshot();

      Logger.log(
        `Portfolio snapshot calculation of user '${job.data.userId}' has been completed in ${(
          (performance.now() - startTime) /
          1000
        ).toFixed(3)} seconds`,
        `PortfolioSnapshotProcessor (${PORTFOLIO_SNAPSHOT_PROCESS_JOB_NAME})`
      );

      const expiration = addMilliseconds(
        new Date(),
        (snapshot.errors?.length ?? 0) === 0
          ? this.configurationService.get('CACHE_QUOTES_TTL')
          : 0
      );

      this.redisCacheService.set(
        this.redisCacheService.getPortfolioSnapshotKey({
          filters: job.data.filters,
          userId: job.data.userId
        }),
        JSON.stringify({
          expiration: expiration.getTime(),
          portfolioSnapshot: snapshot
        } as unknown as PortfolioSnapshotValue),
        CACHE_TTL_INFINITE
      );

      return snapshot;
    } catch (error) {
      Logger.error(
        error,
        `PortfolioSnapshotProcessor (${PORTFOLIO_SNAPSHOT_PROCESS_JOB_NAME})`
      );

      throw new Error(error);
    }
  }
}
