import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { UserService } from '@ghostfolio/api/app/user/user.service';
import { ApiService } from '@ghostfolio/api/services/api/api.service';
import { PortfolioSnapshotService } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service';
import {
  PORTFOLIO_SNAPSHOT_COMPUTATION_QUEUE_PRIORITY_LOW,
  PORTFOLIO_SNAPSHOT_PROCESS_JOB_NAME,
  PORTFOLIO_SNAPSHOT_PROCESS_JOB_OPTIONS
} from '@ghostfolio/common/config';

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import ms from 'ms';

import { PortfolioChangedEvent } from './portfolio-changed.event';

@Injectable()
export class PortfolioChangedListener {
  private readonly logger = new Logger(PortfolioChangedListener.name);

  private static readonly DEBOUNCE_DELAY = ms('5 seconds');

  private debounceTimers = new Map<string, NodeJS.Timeout>();

  public constructor(
    private readonly apiService: ApiService,
    private readonly portfolioSnapshotService: PortfolioSnapshotService,
    private readonly redisCacheService: RedisCacheService,
    private readonly userService: UserService
  ) {}

  @OnEvent(PortfolioChangedEvent.getName())
  handlePortfolioChangedEvent(event: PortfolioChangedEvent) {
    const userId = event.getUserId();

    const existingTimer = this.debounceTimers.get(userId);

    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    this.debounceTimers.set(
      userId,
      setTimeout(() => {
        this.debounceTimers.delete(userId);

        void this.processPortfolioChanged({ userId });
      }, PortfolioChangedListener.DEBOUNCE_DELAY)
    );
  }

  private async processPortfolioChanged({ userId }: { userId: string }) {
    this.logger.log(`Portfolio of user '${userId}' has changed`);

    try {
      await this.redisCacheService.removePortfolioSnapshotsByUserId({ userId });

      const user = await this.userService.user({ id: userId });

      if (!user) {
        return;
      }

      const userSettings = user.settings.settings;

      const filters = this.apiService.buildFiltersFromUserSettings({
        userSettings
      });

      // Recompute in the background to avoid a cold start on the next request
      await this.portfolioSnapshotService.addJobToQueue({
        data: {
          filters,
          userId,
          calculationType: userSettings.performanceCalculationType,
          userCurrency: userSettings.baseCurrency
        },
        name: PORTFOLIO_SNAPSHOT_PROCESS_JOB_NAME,
        opts: {
          ...PORTFOLIO_SNAPSHOT_PROCESS_JOB_OPTIONS,
          jobId: this.redisCacheService.getPortfolioSnapshotKey({
            filters,
            userId
          }),
          priority: PORTFOLIO_SNAPSHOT_COMPUTATION_QUEUE_PRIORITY_LOW
        }
      });
    } catch (error) {
      this.logger.error(
        `Portfolio snapshot of user '${userId}' could not be recomputed`,
        error
      );
    }
  }
}
