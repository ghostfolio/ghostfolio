import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';

import { Module } from '@nestjs/common';

import { AssetsController } from './assets.controller';

@Module({
  controllers: [AssetsController],
  providers: [ConfigurationService]
})
export class AssetsModule {}
