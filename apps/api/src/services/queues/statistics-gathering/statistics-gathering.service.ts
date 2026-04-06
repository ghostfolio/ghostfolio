import {
  GATHER_STATISTICS_PROCESS_JOB_NAME,
  GATHER_STATISTICS_PROCESS_JOB_OPTIONS,
  STATISTICS_GATHERING_QUEUE
} from '@ghostfolio/common/config';

import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';

@Injectable()
export class StatisticsGatheringService {
  public constructor(
    @InjectQueue(STATISTICS_GATHERING_QUEUE)
    private readonly statisticsGatheringQueue: Queue
  ) {}

  public async addJobToQueue() {
    return this.statisticsGatheringQueue.add(
      GATHER_STATISTICS_PROCESS_JOB_NAME,
      {},
      GATHER_STATISTICS_PROCESS_JOB_OPTIONS
    );
  }
}
