import { Job, JobStatus } from 'bull';

export interface AdminJobs {
  jobs: (Pick<
    Job<any>,
    | 'attemptsMade'
    | 'data'
    | 'finishedOn'
    | 'id'
    | 'name'
    | 'opts'
    | 'stacktrace'
    | 'timestamp'
  > & {
    state: JobStatus | 'stuck';
  })[];
}
