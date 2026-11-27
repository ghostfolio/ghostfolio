import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { RedisCacheModule } from '@ghostfolio/api/services/redis-cache/redis-cache.module';

import { Module } from '@nestjs/common';

import { OAuthClientService } from './oauth-client.service';
import { OAuthMetadataController } from './oauth-metadata.controller';
import { OAuthStorageService } from './oauth-storage.service';

@Module({
  controllers: [OAuthMetadataController],
  exports: [OAuthClientService, OAuthStorageService],
  imports: [ConfigurationModule, RedisCacheModule],
  providers: [OAuthClientService, OAuthStorageService]
})
export class OAuthModule {}
