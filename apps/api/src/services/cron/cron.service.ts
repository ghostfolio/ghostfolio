import { UserService } from '@ghostfolio/api/app/user/user.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import { DataGatheringService } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.service';
import { TwitterBotService } from '@ghostfolio/api/services/twitter-bot/twitter-bot.service';
import {
  DATA_GATHERING_QUEUE_PRIORITY_LOW,
  GATHER_ASSET_PROFILE_PROCESS_JOB_NAME,
  GATHER_ASSET_PROFILE_PROCESS_JOB_OPTIONS,
  PROPERTY_IS_DATA_GATHERING_ENABLED
} from '@ghostfolio/common/config';
import { getAssetProfileIdentifier } from '@ghostfolio/common/helper';

import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CronService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CronService.name);
  private static readonly EVERY_HOUR_AT_RANDOM_MINUTE = `${new Date().getMinutes()} * * * *`;
  private static readonly EVERY_SUNDAY_AT_LUNCH_TIME = '0 12 * * 0';

  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly dataGatheringService: DataGatheringService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly propertyService: PropertyService,
    private readonly twitterBotService: TwitterBotService,
    private readonly userService: UserService
  ) {}

  public async onApplicationBootstrap() {
    if (await this.isDataGatheringEnabled()) {
      this.logger.log('Triggering initial data gathering on startup...');
      await this.dataGatheringService.gather7Days();
    }

    // Reload exchange rates after data gathering queue has had time
    // to process high-priority currency pair jobs (~1 job per 4s).
    // This ensures rates are populated on fresh Railway deployments.
    setTimeout(
      async () => {
        try {
          await this.exchangeRateDataService.loadCurrencies();
          this.logger.log(
            'Exchange rates reloaded after startup data gathering'
          );
        } catch (error) {
          this.logger.warn('Failed to reload exchange rates on startup', error);
        }
      },
      5 * 60 * 1000
    );
  }

  @Cron(CronService.EVERY_HOUR_AT_RANDOM_MINUTE)
  public async runEveryHourAtRandomMinute() {
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
    if (this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION')) {
      this.twitterBotService.tweetFearAndGreedIndex();
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  public async runEveryDayAtMidnight() {
    if (this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION')) {
      this.userService.resetAnalytics();
    }
  }

  @Cron(CronService.EVERY_SUNDAY_AT_LUNCH_TIME)
  public async runEverySundayAtTwelvePm() {
    if (await this.isDataGatheringEnabled()) {
      const assetProfileIdentifiers =
        await this.dataGatheringService.getActiveAssetProfileIdentifiers({
          maxAge: '60 days'
        });

      await this.dataGatheringService.addJobsToQueue(
        assetProfileIdentifiers.map(({ dataSource, symbol }) => {
          return {
            data: {
              dataSource,
              symbol
            },
            name: GATHER_ASSET_PROFILE_PROCESS_JOB_NAME,
            opts: {
              ...GATHER_ASSET_PROFILE_PROCESS_JOB_OPTIONS,
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
