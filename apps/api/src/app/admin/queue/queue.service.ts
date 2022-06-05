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

    return {
      jobs: jobs.slice(0, limit)
    };
  }
}
