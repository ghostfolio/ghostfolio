import {
  DATA_GATHERING_QUEUE,
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
    private readonly dataGatheringQueue: Queue
  ) {}

  public async deleteJob(aId: string) {
    return (await this.dataGatheringQueue.getJob(aId))?.remove();
  }

  public async deleteJobs({
    status = QUEUE_JOB_STATUS_LIST
  }: {
    status?: JobStatus[];
  }) {
    for (const statusItem of status) {
      await this.dataGatheringQueue.clean(
        300,
        statusItem === 'waiting' ? 'wait' : statusItem
      );
    }
  }

  public async getJobs({
    limit = 1000,
    status = QUEUE_JOB_STATUS_LIST
  }: {
    limit?: number;
    status?: JobStatus[];
  }): Promise<AdminJobs> {
    const jobs = await this.dataGatheringQueue.getJobs(status);

    const jobsWithState = await Promise.all(
      jobs
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
