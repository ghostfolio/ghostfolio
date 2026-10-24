import { UserService } from '@ghostfolio/api/app/user/user.service';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import { DataGatheringService } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.service';
import { StatisticsGatheringService } from '@ghostfolio/api/services/queues/statistics-gathering/statistics-gathering.service';
import { TwitterBotService } from '@ghostfolio/api/services/twitter-bot/twitter-bot.service';
import {
  DATA_GATHERING_QUEUE_PRIORITY_LOW,
  GATHER_ASSET_PROFILE_PROCESS_JOB_NAME,
  GATHER_ASSET_PROFILE_PROCESS_JOB_OPTIONS,
  PROPERTY_IS_DATA_GATHERING_ENABLED
} from '@ghostfolio/common/config';
import { getAssetProfileIdentifier } from '@ghostfolio/common/helper';

import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit
} from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import ms from 'ms';

@Injectable()
export class CronService implements OnModuleDestroy, OnModuleInit {
  private static readonly HOURLY_MARKET_DATA_GATHERING_JOB_NAME =
    'HOURLY_MARKET_DATA_GATHERING';
  private static readonly EVERY_SUNDAY_AT_LUNCH_TIME = '0 12 * * 0';

  private isHourlyMarketDataGatheringRunning = false;

  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly dataGatheringService: DataGatheringService,
    private readonly propertyService: PropertyService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly statisticsGatheringService: StatisticsGatheringService,
    private readonly twitterBotService: TwitterBotService,
    private readonly userService: UserService
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  public async runEveryHour() {
    if (this.configurationService.get('ENABLE_FEATURE_STATISTICS')) {
      await this.statisticsGatheringService.addJobsToQueue();
    }
  }

  public onModuleInit() {
    const intervalInMinutes = Math.max(
      1,
      this.configurationService.get('DATA_GATHERING_INTERVAL_MINUTES')
    );

    // The interval starts at the application start, which is equivalent to the
    // former hourly cron job running at the minute of the application start
    this.schedulerRegistry.addInterval(
      CronService.HOURLY_MARKET_DATA_GATHERING_JOB_NAME,
      setInterval(
        () => {
          void this.runHourlyMarketDataGathering();
        },
        ms(`${intervalInMinutes} minutes`)
      )
    );
  }

  public onModuleDestroy() {
    try {
      this.schedulerRegistry.deleteInterval(
        CronService.HOURLY_MARKET_DATA_GATHERING_JOB_NAME
      );
    } catch {}
  }

  public async runHourlyMarketDataGathering() {
    // Skip the run if the previous one is still in progress to avoid
    // overlapping requests to the data providers
    if (this.isHourlyMarketDataGatheringRunning) {
      return;
    }

    this.isHourlyMarketDataGatheringRunning = true;

    try {
      if (await this.isDataGatheringEnabled()) {
        await this.dataGatheringService.gatherHourlyMarketData();
        await this.dataGatheringService.gatherRecentMarketData();
      }
    } catch (error) {
      Logger.error(error, 'CronService');
    } finally {
      this.isHourlyMarketDataGatheringRunning = false;
    }
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
