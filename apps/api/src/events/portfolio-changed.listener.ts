import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import ms from 'ms';

import { PortfolioChangedEvent } from './portfolio-changed.event';

@Injectable()
export class PortfolioChangedListener {
  private static readonly DEBOUNCE_DELAY = ms('5 seconds');

  private debounceTimers = new Map<string, NodeJS.Timeout>();

  public constructor(private readonly redisCacheService: RedisCacheService) {}

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
    Logger.log(
      `Portfolio of user '${userId}' has changed`,
      'PortfolioChangedListener'
    );

    await this.redisCacheService.removePortfolioSnapshotsByUserId({ userId });
  }
}
