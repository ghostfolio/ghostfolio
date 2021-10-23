import { TrackinsightDataEnhancerService } from '@ghostfolio/api/services/data-provider/data-enhancer/trackinsight/trackinsight.service';
import { Module } from '@nestjs/common';

@Module({
  exports: [TrackinsightDataEnhancerService],
  providers: [TrackinsightDataEnhancerService]
})
export class DataEnhancerModule {}
