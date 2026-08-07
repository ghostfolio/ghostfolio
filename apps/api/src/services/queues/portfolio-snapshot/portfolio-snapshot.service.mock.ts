import { PortfolioSnapshotValue } from '@ghostfolio/api/app/portfolio/interfaces/snapshot-value.interface';
import { RedisCacheServiceMock } from '@ghostfolio/api/app/redis-cache/redis-cache.service.mock';

import type { Job, JobId, JobOptions } from 'bull';
import ms from 'ms';
import { setTimeout } from 'timers/promises';

import { PortfolioSnapshotQueueJob } from './interfaces/portfolio-snapshot-queue-job.interface';

export const PortfolioSnapshotServiceMock = {
  addJobToQueue: ({
    opts
  }: {
    data: PortfolioSnapshotQueueJob;
    name: string;
    opts?: JobOptions;
  }): Promise<Job> => {
    const mockJob: Partial<Job> = {
      finished: async () => {
        await setTimeout(100);

        // Mimic the processor which caches the computed portfolio snapshot
        // under the job id
        await RedisCacheServiceMock.set(
          opts?.jobId as string,
          JSON.stringify({
            expiration: Date.now() + ms('1 minute'),
            portfolioSnapshot: {}
          } as unknown as PortfolioSnapshotValue)
        );
      }
    };

    PortfolioSnapshotServiceMock.jobsStore.set(opts?.jobId, mockJob);

    return Promise.resolve(mockJob as Job);
  },
  getJob: (jobId: JobId): Promise<Job> => {
    const job = PortfolioSnapshotServiceMock.jobsStore.get(jobId);

    return Promise.resolve(job as Job);
  },
  jobsStore: new Map<JobId, Partial<Job>>(),
  reset: () => {
    PortfolioSnapshotServiceMock.jobsStore.clear();
  }
};
