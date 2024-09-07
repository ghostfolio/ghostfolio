import {
  PORTFOLIO_SNAPSHOT_PROCESS_JOB_NAME,
  PORTFOLIO_SNAPSHOT_QUEUE
} from '@ghostfolio/common/config';

import { Process, Processor } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bull';
import ms from 'ms';
import { setTimeout } from 'timers/promises';

import { IPortfolioSnapshotQueueJob } from './interfaces/portfolio-snapshot-queue-job.interface';

@Injectable()
@Processor(PORTFOLIO_SNAPSHOT_QUEUE)
export class PortfolioSnapshotProcessor {
  public constructor() {}

  @Process({ concurrency: 1, name: PORTFOLIO_SNAPSHOT_PROCESS_JOB_NAME })
  public async calculatePortfolioSnapshot(
    job: Job<IPortfolioSnapshotQueueJob>
  ) {
    try {
      Logger.log(
        `Portfolio snapshot calculation of user ${job.data.userId} has been started`,
        `PortfolioSnapshotProcessor (${PORTFOLIO_SNAPSHOT_PROCESS_JOB_NAME})`
      );

      // TODO: Do something
      await setTimeout(ms('1 second'));

      Logger.log(
        `Portfolio snapshot calculation of user ${job.data.userId} has been completed`,
        `PortfolioSnapshotProcessor (${PORTFOLIO_SNAPSHOT_PROCESS_JOB_NAME})`
      );
    } catch (error) {
      Logger.error(
        error,
        `PortfolioSnapshotProcessor (${PORTFOLIO_SNAPSHOT_PROCESS_JOB_NAME})`
      );

      throw new Error(error);
    }
  }
}
