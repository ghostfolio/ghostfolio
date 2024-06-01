import { RedisCacheModule } from '@ghostfolio/api/app/redis-cache/redis-cache.module';

import { Module } from '@nestjs/common';

import { CacheController } from './cache.controller';

@Module({
  controllers: [CacheController],
  imports: [RedisCacheModule]
})
export class CacheModule {}
