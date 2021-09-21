import { DataGatheringService } from '@ghostfolio/api/services/data-gathering.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class CacheService {
  public constructor(
    private readonly dataGaterhingService: DataGatheringService,
    private readonly exchangeRateDataService: ExchangeRateDataService
  ) {}

  public async flush(): Promise<void> {
    await this.exchangeRateDataService.initialize();
    await this.dataGaterhingService.reset();

    return;
  }
}
