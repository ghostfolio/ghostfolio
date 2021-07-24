import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { DataGatheringService } from './data-gathering.service';
import { ExchangeRateDataService } from './exchange-rate-data.service';

@Injectable()
export class CronService {
  public constructor(
    private readonly dataGatheringService: DataGatheringService,
    private readonly exchangeRateDataService: ExchangeRateDataService
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  public async runEveryMinute() {
    await this.dataGatheringService.gather7Days();
  }

  @Cron(CronExpression.EVERY_12_HOURS)
  public async runEveryTwelveHours() {
    await this.dataGatheringService.gatherProfileData();
    await this.exchangeRateDataService.loadCurrencies();
  }
}
