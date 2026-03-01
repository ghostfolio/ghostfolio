import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';

import { Module } from '@nestjs/common';

import { PayTheFlyController } from './paythefly.controller';
import { PayTheFlyService } from './paythefly.service';

@Module({
  controllers: [PayTheFlyController],
  exports: [PayTheFlyService],
  imports: [ConfigurationModule],
  providers: [PayTheFlyService]
})
export class PayTheFlyModule {}
