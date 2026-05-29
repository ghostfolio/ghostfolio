import { FetchService } from '@ghostfolio/api/services/fetch/fetch.service';
import { PropertyModule } from '@ghostfolio/api/services/property/property.module';

import { Module } from '@nestjs/common';

@Module({
  exports: [FetchService],
  imports: [PropertyModule],
  providers: [FetchService]
})
export class FetchModule {}
