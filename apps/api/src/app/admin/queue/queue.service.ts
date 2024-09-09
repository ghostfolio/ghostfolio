import {
  DATA_GATHERING_QUEUE,
  PORTFOLIO_SNAPSHOT_QUEUE,
  QUEUE_JOB_STATUS_LIST
} from '@ghostfolio/common/config';
import { AdminJobs } from '@ghostfolio/common/interfaces';

import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { JobStatus, Queue } from 'bull';

@Injectable()
export class QueueService {
  public constructor(
    @InjectQueue(DATA_GATHERING_QUEUE)
    private readonly dataGatheringQueue: Queue,
    @InjectQueue(PORTFOLIO_SNAPSHOT_QUEUE)
    private readonly portfolioSnapshotQueue: Queue
  ) {}

  public async deleteJob(aId: string) {
    let job = await this.dataGatheringQueue.getJob(aId);

    if (!job) {
      job = await this.portfolioSnapshotQueue.getJob(aId);
    }

    return job?.remove();
  }

  public async deleteJobs({
    status = QUEUE_JOB_STATUS_LIST
  }: {
    status?: JobStatus[];
  }) {
    for (const statusItem of status) {
      const queueStatus = statusItem === 'waiting' ? 'wait' : statusItem;

      await this.dataGatheringQueue.clean(300, queueStatus);
      await this.portfolioSnapshotQueue.clean(300, queueStatus);
    }
  }

  public async executeJob(aId: string) {
    let job = await this.dataGatheringQueue.getJob(aId);

    if (!job) {
      job = await this.portfolioSnapshotQueue.getJob(aId);
    }

    return job?.promote();
  }

  public async getJobs({
    limit = 1000,
    status = QUEUE_JOB_STATUS_LIST
  }: {
    limit?: number;
    status?: JobStatus[];
  }): Promise<AdminJobs> {
    const [dataGatheringJobs, portfolioSnapshotJobs] = await Promise.all([
      this.dataGatheringQueue.getJobs(status),
      this.portfolioSnapshotQueue.getJobs(status)
    ]);

    const allJobs = [...dataGatheringJobs, ...portfolioSnapshotJobs];

    const jobsWithState = await Promise.all(
      allJobs
        .filter((job) => {
          return job;
        })
        .slice(0, limit)
        .map(async (job) => {
          return {
            attemptsMade: job.attemptsMade + 1,
            data: job.data,
            finishedOn: job.finishedOn,
            id: job.id,
            name: job.name,
            opts: job.opts,
            stacktrace: job.stacktrace,
            state: await job.getState(),
            timestamp: job.timestamp
          };
        })
    );

    return {
      jobs: jobsWithState
    };
  }
}
