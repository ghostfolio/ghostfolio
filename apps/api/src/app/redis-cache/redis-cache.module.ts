import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';

import KeyvRedis, { Keyv } from '@keyv/redis';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';

import { RedisCacheService } from './redis-cache.service';

@Module({
  exports: [RedisCacheService],
  imports: [
    CacheModule.registerAsync<Keyv>({
      imports: [ConfigurationModule],
      inject: [ConfigurationService],
      useFactory: async (configurationService: ConfigurationService) => {
        const redisPassword = encodeURIComponent(
          configurationService.get('REDIS_PASSWORD')
        );

        return {
          store: new Keyv({
            store: new KeyvRedis(
              `redis://${redisPassword ? `:${redisPassword}` : ''}@${configurationService.get('REDIS_HOST')}:${configurationService.get('REDIS_PORT')}/${configurationService.get('REDIS_DB')}`
            ),
            ttl: configurationService.get('CACHE_TTL'),
            useKeyPrefix: false
          })
        } as Keyv;
      }
    }),
    ConfigurationModule
  ],
  providers: [RedisCacheService]
})
export class RedisCacheModule {}
