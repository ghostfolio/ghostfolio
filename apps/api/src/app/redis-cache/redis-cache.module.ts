import { ConfigurationModule } from '@ghostfolio/api/services/configuration.module';
import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { CacheManagerOptions, CacheModule, Module } from '@nestjs/common';
import * as redisStore from 'cache-manager-redis-store';

import { RedisCacheService } from './redis-cache.service';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigurationModule],
      inject: [ConfigurationService],
      useFactory: async (configurationService: ConfigurationService) => {
        return <CacheManagerOptions>{
          host: configurationService.get('REDIS_HOST'),
          max: configurationService.get('MAX_ITEM_IN_CACHE'),
          password: configurationService.get('REDIS_PASSWORD'),
          port: configurationService.get('REDIS_PORT'),
          store: redisStore,
          ttl: configurationService.get('CACHE_TTL')
        };
      }
    }),
    ConfigurationModule
  ],
  providers: [RedisCacheService],
  exports: [RedisCacheService]
})
export class RedisCacheModule {}
