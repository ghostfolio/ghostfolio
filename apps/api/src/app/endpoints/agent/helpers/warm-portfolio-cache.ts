import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { UserService } from '@ghostfolio/api/app/user/user.service';
import { PortfolioSnapshotService } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service';
import {
  DEFAULT_CURRENCY,
  PORTFOLIO_SNAPSHOT_COMPUTATION_QUEUE_PRIORITY_HIGH,
  PORTFOLIO_SNAPSHOT_PROCESS_JOB_NAME,
  PORTFOLIO_SNAPSHOT_PROCESS_JOB_OPTIONS
} from '@ghostfolio/common/config';
import { PerformanceCalculationType } from '@ghostfolio/common/types/performance-calculation-type.type';

const SNAPSHOT_TIMEOUT_MS = 30_000;

export async function warmPortfolioCache({
  portfolioSnapshotService,
  redisCacheService,
  userService,
  userId
}: {
  portfolioSnapshotService: PortfolioSnapshotService;
  redisCacheService: RedisCacheService;
  userService: UserService;
  userId: string;
}) {
  // 1. Clear stale snapshots
  await redisCacheService.removePortfolioSnapshotsByUserId({ userId });

  // 2. Drain any in-flight stale job
  const existingJob = await portfolioSnapshotService.getJob(userId);

  if (existingJob) {
    try {
      await existingJob.finished();
    } catch {}

    await redisCacheService.removePortfolioSnapshotsByUserId({ userId });
  }

  // 3. Fetch user settings for job params
  const user = await userService.user({ id: userId });
  const userCurrency =
    user?.settings?.settings?.baseCurrency ?? DEFAULT_CURRENCY;
  const calculationType =
    user?.settings?.settings?.performanceCalculationType ??
    PerformanceCalculationType.TWR;

  // 4. Enqueue fresh computation (use return value directly — avoids race
  //    where getJob() returns null after removeOnComplete deletes the job)
  const job = await portfolioSnapshotService.addJobToQueue({
    data: { calculationType, filters: [], userCurrency, userId },
    name: PORTFOLIO_SNAPSHOT_PROCESS_JOB_NAME,
    opts: {
      ...PORTFOLIO_SNAPSHOT_PROCESS_JOB_OPTIONS,
      jobId: userId,
      priority: PORTFOLIO_SNAPSHOT_COMPUTATION_QUEUE_PRIORITY_HIGH
    }
  });

  // 5. Await with timeout — don't block forever if computation hangs
  await Promise.race([
    job.finished(),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error('Snapshot computation timed out')),
        SNAPSHOT_TIMEOUT_MS
      )
    )
  ]);
}
