import { DataGatheringQueueModule } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.module';
import { PortfolioSnapshotQueueModule } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.module';
import { StatisticsGatheringQueueModule } from '@ghostfolio/api/services/queues/statistics-gathering/statistics-gathering.module';

import { Module } from '@nestjs/common';

import { QueueController } from './queue.controller';
import { QueueService } from './queue.service';

@Module({
  controllers: [QueueController],
  imports: [
    DataGatheringQueueModule,
    PortfolioSnapshotQueueModule,
    StatisticsGatheringQueueModule
  ],
  providers: [QueueService]
})
export class QueueModule {}
