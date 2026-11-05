import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';

import { Module } from '@nestjs/common';

import { OAuthMetadataController } from './oauth-metadata.controller';

@Module({
  controllers: [OAuthMetadataController],
  imports: [ConfigurationModule]
})
export class OAuthModule {}
