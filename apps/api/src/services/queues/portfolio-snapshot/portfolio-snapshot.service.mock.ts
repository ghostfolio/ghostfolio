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
    const mockJob: Partial<Bull.Job<any>> = {
      finished: async () => {
        await setTimeout(100);

        return Promise.resolve();
      }
    };

    this.jobsStore.set(opts?.jobId, mockJob);

    return Promise.resolve(mockJob as Bull.Job<any>);
  },
  getJob(jobId: string): Promise<Bull.Job<any>> {
    const job = this.jobsStore.get(jobId);

    return Promise.resolve(job as Bull.Job<any>);
  },
  jobsStore: new Map<string, Partial<Bull.Job<any>>>()
};
