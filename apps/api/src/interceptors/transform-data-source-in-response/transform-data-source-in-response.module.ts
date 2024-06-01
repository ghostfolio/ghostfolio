import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';

import { Module } from '@nestjs/common';

@Module({
  exports: [ConfigurationService],
  imports: [ConfigurationModule],
  providers: [ConfigurationService]
})
export class TransformDataSourceInResponseModule {}
