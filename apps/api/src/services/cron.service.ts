import {
  DATA_GATHERING_QUEUE_PRIORITY_LOW,
  GATHER_ASSET_PROFILE_PROCESS,
  GATHER_ASSET_PROFILE_PROCESS_OPTIONS,
  PROPERTY_IS_DATA_GATHERING_ENABLED
} from '@ghostfolio/common/config';
import { getAssetProfileIdentifier } from '@ghostfolio/common/helper';

import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { ExchangeRateDataService } from './exchange-rate-data/exchange-rate-data.service';
import { PropertyService } from './property/property.service';
import { DataGatheringService } from './queues/data-gathering/data-gathering.service';
import { TwitterBotService } from './twitter-bot/twitter-bot.service';

@Injectable()
export class CronService {
  private static readonly EVERY_SUNDAY_AT_LUNCH_TIME = '0 12 * * 0';

  public constructor(
    private readonly dataGatheringService: DataGatheringService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly propertyService: PropertyService,
    private readonly twitterBotService: TwitterBotService
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  public async runEveryHour() {
    if (await this.isDataGatheringEnabled()) {
      await this.dataGatheringService.gather7Days();
    }
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
    if (await this.isDataGatheringEnabled()) {
      const assetProfileIdentifiers =
        await this.dataGatheringService.getAllAssetProfileIdentifiers();

      await this.dataGatheringService.addJobsToQueue(
        assetProfileIdentifiers.map(({ dataSource, symbol }) => {
          return {
            data: {
              dataSource,
              symbol
            },
            name: GATHER_ASSET_PROFILE_PROCESS,
            opts: {
              ...GATHER_ASSET_PROFILE_PROCESS_OPTIONS,
              jobId: getAssetProfileIdentifier({ dataSource, symbol }),
              priority: DATA_GATHERING_QUEUE_PRIORITY_LOW
            }
          };
        })
      );
    }
  }

  private async isDataGatheringEnabled() {
    return (await this.propertyService.getByKey(
      PROPERTY_IS_DATA_GATHERING_ENABLED
    )) === false
      ? false
      : true;
  }
}
