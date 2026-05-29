import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { FetchService } from '@ghostfolio/api/services/fetch/fetch.service';
import { PropertyModule } from '@ghostfolio/api/services/property/property.module';

import { Module } from '@nestjs/common';

@Module({
  exports: [FetchService],
  imports: [ConfigurationModule, PropertyModule],
  providers: [FetchService]
})
export class FetchModule {}
