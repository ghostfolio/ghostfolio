import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { DataGatheringService } from './data-gathering.service';
import { ExchangeRateDataService } from './exchange-rate-data.service';
import { TwitterBotService } from './twitter-bot/twitter-bot.service';

@Injectable()
export class CronService {
  public constructor(
    private readonly dataGatheringService: DataGatheringService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly twitterBotService: TwitterBotService
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  public async runEveryMinute() {
    await this.dataGatheringService.gather7Days();
  }

  @Cron(CronExpression.EVERY_12_HOURS)
  public async runEveryTwelveHours() {
    await this.exchangeRateDataService.loadCurrencies();
  }

  @Cron(CronExpression.EVERY_DAY_AT_5PM)
  public async runEveryDayAtFivePM() {
    this.twitterBotService.tweetFearAndGreedIndex();
  }

  @Cron(CronExpression.EVERY_WEEKEND)
  public async runEveryWeekend() {
    await this.dataGatheringService.gatherProfileData();
  }
}
