import {
  GATHER_STATISTICS_DOCKER_HUB_PULLS_PROCESS_JOB_NAME,
  GATHER_STATISTICS_GITHUB_CONTRIBUTORS_PROCESS_JOB_NAME,
  GATHER_STATISTICS_GITHUB_FORKS_PROCESS_JOB_NAME,
  GATHER_STATISTICS_GITHUB_STARGAZERS_PROCESS_JOB_NAME,
  GATHER_STATISTICS_PROCESS_JOB_OPTIONS,
  GATHER_STATISTICS_UPTIME_PROCESS_JOB_NAME,
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

  public async addJobsToQueue() {
    return Promise.all(
      [
        GATHER_STATISTICS_DOCKER_HUB_PULLS_PROCESS_JOB_NAME,
        GATHER_STATISTICS_GITHUB_CONTRIBUTORS_PROCESS_JOB_NAME,
        GATHER_STATISTICS_GITHUB_FORKS_PROCESS_JOB_NAME,
        GATHER_STATISTICS_GITHUB_STARGAZERS_PROCESS_JOB_NAME,
        GATHER_STATISTICS_UPTIME_PROCESS_JOB_NAME
      ].map((jobName) => {
        return this.statisticsGatheringQueue.add(
          jobName,
          {},
          {
            ...GATHER_STATISTICS_PROCESS_JOB_OPTIONS,
            jobId: jobName
          }
        );
      })
    );
  }
}
