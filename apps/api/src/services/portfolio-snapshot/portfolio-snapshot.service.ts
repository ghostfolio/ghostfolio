import { PORTFOLIO_SNAPSHOT_QUEUE } from '@ghostfolio/common/config';

import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { JobOptions, Queue } from 'bull';

import { IPortfolioSnapshotQueueJob } from './interfaces/portfolio-snapshot-queue-job.interface';

@Injectable()
export class PortfolioSnapshotService {
  public constructor(
    @InjectQueue(PORTFOLIO_SNAPSHOT_QUEUE)
    private readonly portfolioSnapshotQueue: Queue
  ) {}

  public async addJobToQueue({
    data,
    name,
    opts
  }: {
    data: IPortfolioSnapshotQueueJob;
    name: string;
    opts?: JobOptions;
  }) {
    return this.portfolioSnapshotQueue.add(name, data, opts);
  }

  // public async addJobsToQueue(
  //   jobs: { data: IPortfolioSnapshotQueueJob; name: string; opts?: JobOptions }[]
  // ) {
  //   return this.portfolioSnapshotQueue.addBulk(jobs);
  // }
}
