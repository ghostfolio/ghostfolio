import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { PortfolioChangedEvent } from './portfolio-changed.event';

@Injectable()
export class PortfolioChangedListener {
  @OnEvent(PortfolioChangedEvent.getName())
  handlePortfolioChangedEvent(event: PortfolioChangedEvent) {
    Logger.log(
      `Portfolio of user with id ${event.getUserId()} has changed`,
      'PortfolioChangedListener'
    );
  }
}
