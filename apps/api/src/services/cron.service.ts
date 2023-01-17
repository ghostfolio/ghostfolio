import {
  GATHER_ASSET_PROFILE_PROCESS,
  GATHER_ASSET_PROFILE_PROCESS_OPTIONS
} from '@ghostfolio/common/config';
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { DataGatheringService } from './data-gathering.service';
import { ExchangeRateDataService } from './exchange-rate-data.service';
import { TwitterBotService } from './twitter-bot/twitter-bot.service';

@Injectable()
export class CronService {
  private static readonly EVERY_SUNDAY_AT_LUNCH_TIME = '0 12 * * 0';

  public constructor(
    private readonly dataGatheringService: DataGatheringService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly twitterBotService: TwitterBotService
  ) {}

  @Cron(CronExpression.EVERY_4_HOURS)
  public async runEveryFourHours() {
    await this.dataGatheringService.gather7Days();
  }

  @Cron(CronExpression.EVERY_12_HOURS)
  public async runEveryTwelveHours() {
    await this.exchangeRateDataService.loadCurrencies();
  }

  @Cron(CronExpression.EVERY_DAY_AT_5PM)
  public async runEveryDayAtFivePm() {
    this.twitterBotService.tweetFearAndGreedIndex();
  }

  @Cron(CronService.EVERY_SUNDAY_AT_LUNCH_TIME)
  public async runEverySundayAtTwelvePm() {
    const uniqueAssets = await this.dataGatheringService.getUniqueAssets();

    for (const { dataSource, symbol } of uniqueAssets) {
      await this.dataGatheringService.addJobToQueue(
        GATHER_ASSET_PROFILE_PROCESS,
        {
          dataSource,
          symbol
        },
        GATHER_ASSET_PROFILE_PROCESS_OPTIONS
      );
    }
  }
}
