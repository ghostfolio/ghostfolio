import { Job } from 'bullmq';

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
    state: string;
  })[];
}
