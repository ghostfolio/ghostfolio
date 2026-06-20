import { ConfigurationModule } from '@ghostfolio/api/services/configuration/configuration.module';
import { PropertyModule } from '@ghostfolio/api/services/property/property.module';
import { STATISTICS_GATHERING_QUEUE } from '@ghostfolio/common/config';

import { BullAdapter } from '@bull-board/api/bullAdapter';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';

import { StatisticsGatheringProcessor } from './statistics-gathering.processor';
import { StatisticsGatheringService } from './statistics-gathering.service';

@Module({
  exports: [BullModule, StatisticsGatheringService],
  imports: [
    ...(process.env.ENABLE_FEATURE_BULL_BOARD === 'true'
      ? [
          BullBoardModule.forFeature({
            adapter: BullAdapter,
            name: STATISTICS_GATHERING_QUEUE,
            options: {
              displayName: 'Statistics Gathering',
              readOnlyMode: process.env.BULL_BOARD_IS_READ_ONLY !== 'false'
            }
          })
        ]
      : []),
    BullModule.registerQueue({
      name: STATISTICS_GATHERING_QUEUE
    }),
    ConfigurationModule,
    PropertyModule
  ],
  providers: [StatisticsGatheringProcessor, StatisticsGatheringService]
})
export class StatisticsGatheringQueueModule {}
