import { Module } from '@nestjs/common';
import { WebManifestController } from './webmanifest.controller';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';

@Module({
  controllers: [WebManifestController],
  providers: [ConfigurationService], 
})
export class WebManifestModule {}
