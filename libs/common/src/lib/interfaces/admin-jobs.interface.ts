import { Job } from 'bull';

export interface AdminJobs {
  jobs: Job<any>[];
}
