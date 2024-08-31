import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';

import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { redisStore } from 'cache-manager-redis-yet';
import type { RedisClientOptions } from 'redis';

import { RedisCacheService } from './redis-cache.service';

@Module({
  exports: [RedisCacheService],
  imports: [
    CacheModule.registerAsync<RedisClientOptions>({
      imports: [ConfigurationModule],
      inject: [ConfigurationService],
      useFactory: async (configurationService: ConfigurationService) => {
        return <RedisClientOptions>{
          store: redisStore,
          ttl: configurationService.get('CACHE_TTL'),
          url: `redis://:${configurationService.get('REDIS_PASSWORD')}@${configurationService.get('REDIS_HOST')}:${configurationService.get('REDIS_PORT')}/${configurationService.get('REDIS_DB')}`
        };
      }
    }),
    ConfigurationModule
  ],
  providers: [RedisCacheService]
})
export class RedisCacheModule {}
