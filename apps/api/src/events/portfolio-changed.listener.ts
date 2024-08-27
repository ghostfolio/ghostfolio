import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { PortfolioChangedEvent } from './portfolio-changed.event';

@Injectable()
export class PortfolioChangedListener {
  public constructor(private readonly redisCacheService: RedisCacheService) {}

  @OnEvent(PortfolioChangedEvent.getName())
  handlePortfolioChangedEvent(event: PortfolioChangedEvent) {
    Logger.log(
      `Portfolio of user '${event.getUserId()}' has changed`,
      'PortfolioChangedListener'
    );

    this.redisCacheService.removePortfolioSnapshotsByUserId({
      userId: event.getUserId()
    });
  }
}
