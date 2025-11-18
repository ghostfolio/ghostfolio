import { ApiKeyModule } from '@ghostfolio/api/services/api-key/api-key.module';

import { Module } from '@nestjs/common';

import { ApiKeysController } from './api-keys.controller';

@Module({
  controllers: [ApiKeysController],
  imports: [ApiKeyModule]
})
export class ApiKeysModule {}
