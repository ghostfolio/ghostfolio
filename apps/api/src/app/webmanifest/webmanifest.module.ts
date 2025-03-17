import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';

import { Module } from '@nestjs/common';

import { WebManifestController } from './webmanifest.controller';

@Module({
  controllers: [WebManifestController],
  providers: [ConfigurationService]
})
export class WebManifestModule {}
