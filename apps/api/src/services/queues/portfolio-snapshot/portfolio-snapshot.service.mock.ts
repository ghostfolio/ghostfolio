import type { Job, JobId, JobOptions } from 'bull';
import { setTimeout } from 'timers/promises';

import { PortfolioSnapshotQueueJob } from './interfaces/portfolio-snapshot-queue-job.interface';

export const PortfolioSnapshotServiceMock = {
  addJobToQueue({
    opts
  }: {
    data: PortfolioSnapshotQueueJob;
    name: string;
    opts?: JobOptions;
  }): Promise<Job> {
    const mockJob: Partial<Job> = {
      finished: async () => {
        await setTimeout(100);

        return Promise.resolve();
      }
    };

    this.jobsStore.set(opts?.jobId, mockJob);

    return Promise.resolve(mockJob as Job);
  },
  getJob(jobId: JobId): Promise<Job> {
    const job = this.jobsStore.get(jobId);

    return Promise.resolve(job as Job);
  },
  jobsStore: new Map<JobId, Partial<Job>>()
};
