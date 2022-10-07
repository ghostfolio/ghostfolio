import { Module } from '@nestjs/common';

import { ApiService } from './api.service';

@Module({
  exports: [ApiService],
  providers: [ApiService]
})
export class ApiModule {}
