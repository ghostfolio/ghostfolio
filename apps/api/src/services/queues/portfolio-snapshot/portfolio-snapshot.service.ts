import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { PORTFOLIO_SNAPSHOT_COMPUTATION_QUEUE } from '@ghostfolio/common/config';

import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { JobOptions, Queue } from 'bull';

import { PortfolioSnapshotQueueJob } from './interfaces/portfolio-snapshot-queue-job.interface';

@Injectable()
export class PortfolioSnapshotService {
  public constructor(
    private readonly configurationService: ConfigurationService,
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
    return this.portfolioSnapshotQueue.add(name, data, {
      ...opts,
      removeOnFail: this.configurationService.get(
        'PROCESSOR_PORTFOLIO_SNAPSHOT_COMPUTATION_REMOVE_ON_FAIL'
      )
    });
  }

  public async getJob(jobId: string) {
    return this.portfolioSnapshotQueue.getJob(jobId);
  }
}
