import { Module } from '@nestjs/common';

import { PortfolioChangedListener } from './portfolio-changed.listener';

@Module({
  providers: [PortfolioChangedListener]
})
export class EventsModule {}
