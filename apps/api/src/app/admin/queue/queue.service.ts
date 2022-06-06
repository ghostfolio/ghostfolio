import { DATA_GATHERING_QUEUE } from '@ghostfolio/common/config';
import { AdminJobs } from '@ghostfolio/common/interfaces';
import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';

@Injectable()
export class QueueService {
  public constructor(
    @InjectQueue(DATA_GATHERING_QUEUE)
    private readonly dataGatheringQueue: Queue
  ) {}

  public async deleteJob(aId: string) {
    return (await this.dataGatheringQueue.getJob(aId))?.remove();
  }

  public async getJobs({
    limit = 1000
  }: {
    limit?: number;
  }): Promise<AdminJobs> {
    const jobs = await this.dataGatheringQueue.getJobs([
      'active',
      'completed',
      'delayed',
      'failed',
      'paused',
      'waiting'
    ]);

    const jobsWithState = await Promise.all(
      jobs.slice(0, limit).map(async (job) => {
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
