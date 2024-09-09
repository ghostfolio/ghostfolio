import { DataGatheringModule } from '@ghostfolio/api/services/data-gathering/data-gathering.module';
import { PortfolioSnapshotQueueModule } from '@ghostfolio/api/services/portfolio-snapshot/portfolio-snapshot.module';

import { Module } from '@nestjs/common';

import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';

@Module({
  controllers: [QueueController],
  imports: [DataGatheringModule, PortfolioSnapshotQueueModule],
  providers: [QueueService]
})
export class QueueModule {}
