import { RedisCacheModule } from '@ghostfolio/api/app/redis-cache/redis-cache.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';

import { Module } from '@nestjs/common';

import { MarketSentimentService } from './market-sentiment.service';

@Module({
  exports: [MarketSentimentService],
  imports: [ConfigurationModule, RedisCacheModule],
  providers: [MarketSentimentService]
})
export class MarketSentimentModule {}
