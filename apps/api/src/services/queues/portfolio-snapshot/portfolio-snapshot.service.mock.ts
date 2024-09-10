import { Job, JobOptions } from 'bull';
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
    opts?: JobOptions;
  }): Promise<Job<any>> {
    const mockJob: Partial<Job<any>> = {
      finished: async () => {
        await setTimeout(100);

        return Promise.resolve();
      }
    };

    this.jobsStore.set(opts?.jobId, mockJob);

    return Promise.resolve(mockJob as Job<any>);
  },
  getJob(jobId: string): Promise<Job<any>> {
    const job = this.jobsStore.get(jobId);

    return Promise.resolve(job as Job<any>);
  },
  jobsStore: new Map<string, Partial<Job<any>>>()
};
