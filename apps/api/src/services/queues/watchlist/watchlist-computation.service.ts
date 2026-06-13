import { WATCHLIST_COMPUTATION_QUEUE } from '@ghostfolio/common/config';

import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { JobOptions, Queue } from 'bull';

import { WatchlistQueueJob } from './interfaces/watchlist-queue-job.interface';

@Injectable()
export class WatchlistComputationService {
  public constructor(
    @InjectQueue(WATCHLIST_COMPUTATION_QUEUE)
    private readonly watchlistComputationQueue: Queue
  ) {}

  public async addJobToQueue({
    data,
    name,
    opts
  }: {
    data: WatchlistQueueJob;
    name: string;
    opts?: JobOptions;
  }) {
    return this.watchlistComputationQueue.add(name, data, opts);
  }

  public async getJob(jobId: string) {
    return this.watchlistComputationQueue.getJob(jobId);
  }
}
