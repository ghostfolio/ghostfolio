import { DataGatheringModule } from '@ghostfolio/api/services/data-gathering/data-gathering.module';

import { Module } from '@nestjs/common';

import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';

@Module({
  controllers: [QueueController],
  imports: [DataGatheringModule],
  providers: [QueueService]
})
export class QueueModule {}
