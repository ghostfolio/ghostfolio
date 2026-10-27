import { AccessModule } from '@ghostfolio/api/services/access/access.module';
import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';

import { Module } from '@nestjs/common';

import { AccessController } from './access.controller';
import { AccessesController } from './accesses.controller';

@Module({
  controllers: [AccessController, AccessesController],
  imports: [AccessModule, ConfigurationModule]
})
export class AccessesModule {}
