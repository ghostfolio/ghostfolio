import { getKeyvRedisOptions } from '@ghostfolio/api/helper/redis-options.helper';
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
        return {
          stores: [
            createKeyv(
              getKeyvRedisOptions({
                db: configurationService.get('REDIS_DB'),
                host: configurationService.get('REDIS_HOST'),
                password: configurationService.get('REDIS_PASSWORD'),
                port: configurationService.get('REDIS_PORT')
              })
            )
          ],
          ttl: configurationService.get('CACHE_TTL')
        };
      }
    }),
    ConfigurationModule
  ],
  providers: [RedisCacheService]
})
export class RedisCacheModule {}
