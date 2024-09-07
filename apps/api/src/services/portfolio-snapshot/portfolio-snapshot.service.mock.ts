import * as Bull from 'bull';
import { setTimeout } from 'timers/promises';

import { IPortfolioSnapshotQueueJob } from './interfaces/portfolio-snapshot-queue-job.interface';

export const PortfolioSnapshotServiceMock = {
  addJobToQueue({
    data,
    name,
    opts
  }: {
    data: IPortfolioSnapshotQueueJob;
    name: string;
    opts?: Bull.JobOptions;
  }): Promise<Bull.Job<any>> {
    // Mock the Job object with a finished method
    const mockJob: Partial<Bull.Job<any>> = {
      // Mock the finished method to return a resolved promise
      finished: async () => {
        await setTimeout(100);

        return Promise.resolve('Mocked job finished result');
      }
    };

    return Promise.resolve(mockJob as Bull.Job<any>);
  }
};
