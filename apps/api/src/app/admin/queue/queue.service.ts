import {
  DATA_GATHERING_QUEUE,
  JobStatusType,
  PORTFOLIO_SNAPSHOT_COMPUTATION_QUEUE,
  QUEUE_JOB_STATUS_LIST
} from '@ghostfolio/common/config';
import { AdminJobs } from '@ghostfolio/common/interfaces';

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class QueueService {
  public constructor(
    @InjectQueue(DATA_GATHERING_QUEUE)
    private readonly dataGatheringQueue: Queue,
    @InjectQueue(PORTFOLIO_SNAPSHOT_COMPUTATION_QUEUE)
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
    status = [...QUEUE_JOB_STATUS_LIST]
  }: {
    status?: JobStatusType[];
  }) {
    for (const statusItem of status) {
      const queueStatus = statusItem === 'waiting' ? 'wait' : statusItem;

      await this.dataGatheringQueue.clean(300, 0, queueStatus);
      await this.portfolioSnapshotQueue.clean(300, 0, queueStatus);
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
    status = [...QUEUE_JOB_STATUS_LIST]
  }: {
    limit?: number;
    status?: JobStatusType[];
  }): Promise<AdminJobs> {
    const [dataGatheringJobs, portfolioSnapshotJobs] = await Promise.all([
      this.dataGatheringQueue.getJobs(status),
      this.portfolioSnapshotQueue.getJobs(status)
    ]);

    const jobsWithState = await Promise.all(
      [...dataGatheringJobs, ...portfolioSnapshotJobs]
        .filter((job) => {
          return job;
        })
        .slice(0, limit)
        .map(async (job) => {
          return {
            attemptsMade: job.attemptsMade,
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
