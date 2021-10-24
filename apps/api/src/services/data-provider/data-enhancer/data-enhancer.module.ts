import { TrackinsightDataEnhancerService } from '@ghostfolio/api/services/data-provider/data-enhancer/trackinsight/trackinsight.service';
import { Module } from '@nestjs/common';

@Module({
  exports: ['DataEnhancers', TrackinsightDataEnhancerService],
  providers: [
    {
      inject: [TrackinsightDataEnhancerService],
      provide: 'DataEnhancers',
      useFactory: (trackinsight) => [trackinsight]
    },
    TrackinsightDataEnhancerService
  ]
})
export class DataEnhancerModule {}
