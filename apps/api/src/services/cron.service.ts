import {
  DATA_GATHERING_QUEUE,
  DATA_GATHERING_QUEUE_PRIORITY_HIGH,
  GATHER_ASSET_PROFILE_PROCESS
} from '@ghostfolio/common/config';
import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bull';
import ms from 'ms';

import { DataGatheringService } from './data-gathering.service';
import { ExchangeRateDataService } from './exchange-rate-data.service';
import { TwitterBotService } from './twitter-bot/twitter-bot.service';

@Injectable()
export class CronService {
  public constructor(
    @InjectQueue(DATA_GATHERING_QUEUE)
    private readonly dataGatheringQueue: Queue,
    private readonly dataGatheringService: DataGatheringService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly twitterBotService: TwitterBotService
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  public async runEveryHour() {
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
    const uniqueAssets = await this.dataGatheringService.getUniqueAssets();

    for (const { dataSource, symbol } of uniqueAssets) {
      await this.dataGatheringQueue.add(
        GATHER_ASSET_PROFILE_PROCESS,
        {
          dataSource,
          symbol
        },
        {
          attempts: 20,
          backoff: {
            delay: ms('1 minute'),
            type: 'exponential'
          },
          priority: DATA_GATHERING_QUEUE_PRIORITY_HIGH
        }
      );
    }
  }
}
