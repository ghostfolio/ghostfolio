import { Job, JobsOptions } from 'bullmq';
import { setTimeout } from 'timers/promises';

import { PortfolioSnapshotQueueJob } from './interfaces/portfolio-snapshot-queue-job.interface';

export const PortfolioSnapshotServiceMock = {
  addJobToQueue({
    opts
  }: {
    data: PortfolioSnapshotQueueJob;
    name: string;
    opts?: JobsOptions;
  }): Promise<Job<any>> {
    const mockJob: Partial<Job<any>> = {
      waitUntilFinished: async () => {
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
