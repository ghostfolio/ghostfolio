import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';

import { RedisCacheService } from './redis-cache.service';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        host: configService.get('REDIS_HOST'),
        max: configService.get('MAX_ITEM_IN_CACHE'),
        port: configService.get('REDIS_PORT'),
        store: redisStore,
        ttl: configService.get('CACHE_TTL')
      })
    })
  ],
  providers: [RedisCacheService],
  exports: [RedisCacheService]
})
export class RedisCacheModule {}
