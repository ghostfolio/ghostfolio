import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';

import { createKeyv } from '@keyv/redis';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';

import { RedisCacheService } from './redis-cache.service';

@Module({
  exports: [RedisCacheService],
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigurationModule],
      inject: [ConfigurationService],
      useFactory: async (configurationService: ConfigurationService) => {
        const redisPassword = encodeURIComponent(
          configurationService.get('REDIS_PASSWORD')
        );

        return {
          stores: [
            createKeyv(
              `redis://${redisPassword ? `:${redisPassword}` : ''}@${configurationService.get('REDIS_HOST')}:${configurationService.get('REDIS_PORT')}/${configurationService.get('REDIS_DB')}`
            )
          ]
        };
      }
    }),
    ConfigurationModule
  ],
  providers: [RedisCacheService]
})
export class RedisCacheModule {}
