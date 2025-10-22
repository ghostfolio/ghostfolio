import { PORTFOLIO_SNAPSHOT_COMPUTATION_QUEUE } from '@ghostfolio/common/config';

import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { JobOptions, Queue } from 'bull';

import { PortfolioSnapshotQueueJob } from './interfaces/portfolio-snapshot-queue-job.interface';

@Injectable()
export class PortfolioSnapshotService {
  public constructor(
    @InjectQueue(PORTFOLIO_SNAPSHOT_COMPUTATION_QUEUE)
    private readonly portfolioSnapshotQueue: Queue
  ) {}

  public async addJobToQueue({
    data,
    name,
    opts
  }: {
    data: PortfolioSnapshotQueueJob;
    name: string;
    opts?: JobOptions;
  }) {
    return this.portfolioSnapshotQueue.add(name, data, opts);
  }

  public async getJob(jobId: string) {
    return this.portfolioSnapshotQueue.getJob(jobId);
  }
}
