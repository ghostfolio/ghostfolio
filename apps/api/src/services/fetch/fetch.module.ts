import { FetchService } from '@ghostfolio/api/services/fetch/fetch.service';

import { Module } from '@nestjs/common';

@Module({
  exports: [FetchService],
  providers: [FetchService]
})
export class FetchModule {}
