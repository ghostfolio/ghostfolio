import { PORTFOLIO_SNAPSHOT_COMPUTATION_QUEUE } from '@ghostfolio/common/config';

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { JobsOptions, Queue, QueueEvents } from 'bullmq';

import { PortfolioSnapshotQueueJob } from './interfaces/portfolio-snapshot-queue-job.interface';

@Injectable()
export class PortfolioSnapshotService {
  private readonly queueEvents: QueueEvents;

  public constructor(
    @InjectQueue(PORTFOLIO_SNAPSHOT_COMPUTATION_QUEUE)
    private readonly portfolioSnapshotQueue: Queue
  ) {
    this.queueEvents = new QueueEvents(PORTFOLIO_SNAPSHOT_COMPUTATION_QUEUE, {
      connection: this.portfolioSnapshotQueue.opts?.connection as any
    });
  }

  public async addJobToQueue({
    data,
    name,
    opts
  }: {
    data: PortfolioSnapshotQueueJob;
    name: string;
    opts?: JobsOptions;
  }) {
    return this.portfolioSnapshotQueue.add(name, data, opts);
  }

  public async getJob(jobId: string) {
    return this.portfolioSnapshotQueue.getJob(jobId);
  }

  public getQueueEvents() {
    return this.queueEvents;
  }
}
