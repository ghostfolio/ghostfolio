import { RedisCacheModule } from '@ghostfolio/api/app/redis-cache/redis-cache.module';

import { Module } from '@nestjs/common';

import { PortfolioChangedListener } from './portfolio-changed.listener';

@Module({
  imports: [RedisCacheModule],
  providers: [PortfolioChangedListener]
})
export class EventsModule {}
