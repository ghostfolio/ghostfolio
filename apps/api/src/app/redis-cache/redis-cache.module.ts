import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { CacheModule, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-store';

import { RedisCacheService } from './redis-cache.service';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configurationService: ConfigurationService) => ({
        host: configurationService.get('REDIS_HOST'),
        max: configurationService.get('MAX_ITEM_IN_CACHE'),
        port: configurationService.get('REDIS_PORT'),
        store: redisStore,
        ttl: configurationService.get('CACHE_TTL')
      })
    })
  ],
  providers: [ConfigurationService, RedisCacheService],
  exports: [RedisCacheService]
})
export class RedisCacheModule {}
