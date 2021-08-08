import { DataGatheringService } from '@ghostfolio/api/services/data-gathering.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CacheService {
  public constructor(
    private readonly dataGaterhingService: DataGatheringService
  ) {}

  public async flush(): Promise<void> {
    await this.dataGaterhingService.reset();

    return;
  }
}
