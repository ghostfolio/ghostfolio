import { DataGatheringService } from '@ghostfolio/api/services/data-gathering.service';
import { Controller } from '@nestjs/common';

import { RedisCacheService } from './redis-cache/redis-cache.service';

@Controller()
export class AppController {
  public constructor(
    private readonly dataGatheringService: DataGatheringService,
    private readonly redisCacheService: RedisCacheService
  ) {
    this.initialize();
  }

  private async initialize() {
    this.redisCacheService.reset();

    const isDataGatheringInProgress =
      await this.dataGatheringService.getIsInProgress();

    if (isDataGatheringInProgress) {
      // Prepare for automatical data gathering, if hung up in progress state
      await this.dataGatheringService.reset();
    }
  }
}
