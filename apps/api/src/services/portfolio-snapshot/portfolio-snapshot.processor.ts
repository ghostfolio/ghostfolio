import { PortfolioSnapshotValue } from '@ghostfolio/api/app/portfolio/interfaces/snapshot-value.interface';
import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import {
  CACHE_TTL_INFINITE,
  PORTFOLIO_SNAPSHOT_PROCESS_JOB_NAME,
  PORTFOLIO_SNAPSHOT_QUEUE
} from '@ghostfolio/common/config';
import { PortfolioSnapshot } from '@ghostfolio/common/models';

import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import * as Big from 'big.js';
import { Job } from 'bull';
import { addMilliseconds } from 'date-fns';

import { IPortfolioSnapshotQueueJob } from './interfaces/portfolio-snapshot-queue-job.interface';

@Injectable()
@Processor(PORTFOLIO_SNAPSHOT_QUEUE)
export class PortfolioSnapshotProcessor {
  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly redisCacheService: RedisCacheService
  ) {}

  @Process({ concurrency: 1, name: PORTFOLIO_SNAPSHOT_PROCESS_JOB_NAME })
  public async calculatePortfolioSnapshot(
    job: Job<IPortfolioSnapshotQueueJob>
  ) {
    try {
      Logger.log(
        `Portfolio snapshot calculation of user ${job.data.userId} has been started`,
        `PortfolioSnapshotProcessor (${PORTFOLIO_SNAPSHOT_PROCESS_JOB_NAME})`
      );

      const snapshot = await this.computeSnapshot();

      Logger.log(
        `Portfolio snapshot calculation of user ${job.data.userId} has been completed`,
        `PortfolioSnapshotProcessor (${PORTFOLIO_SNAPSHOT_PROCESS_JOB_NAME})`
      );

      const expiration = addMilliseconds(
        new Date(),
        this.configurationService.get('CACHE_QUOTES_TTL')
      );

      this.redisCacheService.set(
        this.redisCacheService.getPortfolioSnapshotKey({
          filters: job.data.filters,
          userId: job.data.userId
        }),
        JSON.stringify(<PortfolioSnapshotValue>(<unknown>{
          expiration: expiration.getTime(),
          portfolioSnapshot: snapshot
        })),
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

  // TODO
  public async computeSnapshot(): Promise<PortfolioSnapshot> {
    return {
      currentValueInBaseCurrency: new Big(0),
      hasErrors: false,
      historicalData: [],
      positions: [],
      totalFeesWithCurrencyEffect: new Big(0),
      totalInterestWithCurrencyEffect: new Big(0),
      totalInvestment: new Big(0),
      totalInvestmentWithCurrencyEffect: new Big(0),
      totalLiabilitiesWithCurrencyEffect: new Big(0),
      totalValuablesWithCurrencyEffect: new Big(0)
    };
  }
}
