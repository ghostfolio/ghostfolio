import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { DataEnhancerInterface } from '@ghostfolio/api/services/data-provider/interfaces/data-enhancer.interface';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { DataGatheringItem } from '@ghostfolio/api/services/interfaces/interfaces';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import {
  DATA_GATHERING_QUEUE,
  DATA_GATHERING_QUEUE_PRIORITY_HIGH,
  DATA_GATHERING_QUEUE_PRIORITY_LOW,
  DATA_GATHERING_QUEUE_PRIORITY_MEDIUM,
  GATHER_HISTORICAL_MARKET_DATA_COOLDOWN_IN_MS,
  GATHER_HISTORICAL_MARKET_DATA_PROCESS_JOB_NAME,
  GATHER_HISTORICAL_MARKET_DATA_PROCESS_JOB_OPTIONS,
  PROPERTY_BENCHMARKS
} from '@ghostfolio/common/config';
import {
  DATE_FORMAT,
  getAssetProfileIdentifier,
  getStartOfUtcDate,
  getStartOfUtcDateOfYesterday
} from '@ghostfolio/common/helper';
import {
  AssetProfileIdentifier,
  BenchmarkProperty
} from '@ghostfolio/common/interfaces';

import { utc } from '@date-fns/utc';
import { InjectQueue } from '@nestjs/bull';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Job, JobOptions, Queue } from 'bull';
import { format, min, subDays, subMilliseconds, subYears } from 'date-fns';
import { isEmpty } from 'lodash';
import ms, { StringValue } from 'ms';

@Injectable()
export class DataGatheringService {
  private readonly logger = new Logger(DataGatheringService.name);

  public constructor(
    @Inject('DataEnhancers')
    private readonly dataEnhancers: DataEnhancerInterface[],
    @InjectQueue(DATA_GATHERING_QUEUE)
    private readonly dataGatheringQueue: Queue,
    private readonly dataProviderService: DataProviderService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly marketDataService: MarketDataService,
    private readonly prismaService: PrismaService,
    private readonly propertyService: PropertyService,
    private readonly symbolProfileService: SymbolProfileService
  ) {}

  public async addJobToQueue({
    data,
    name,
    opts
  }: {
    data: any;
    name: string;
    opts?: JobOptions;
  }) {
    return this.dataGatheringQueue.add(name, data, opts);
  }

  public async addJobsToQueue(
    jobs: { data: any; name: string; opts?: JobOptions }[]
  ) {
    return this.dataGatheringQueue.addBulk(jobs);
  }

  public async gatherAssetProfiles(
    aAssetProfileIdentifiers?: AssetProfileIdentifier[]
  ) {
    let assetProfileIdentifiers = aAssetProfileIdentifiers?.filter(
      (dataGatheringItem) => {
        return dataGatheringItem.dataSource !== 'MANUAL';
      }
    );

    if (!assetProfileIdentifiers) {
      assetProfileIdentifiers = await this.getActiveAssetProfileIdentifiers();
    }

    if (assetProfileIdentifiers.length <= 0) {
      return;
    }

    const assetProfiles = await this.dataProviderService.getAssetProfiles(
      assetProfileIdentifiers
    );
    const symbolProfiles = await this.symbolProfileService.getSymbolProfiles(
      assetProfileIdentifiers
    );

    for (const { dataSource, symbol } of assetProfileIdentifiers) {
      const assetProfile =
        assetProfiles[getAssetProfileIdentifier({ dataSource, symbol })];

      if (!assetProfile) {
        continue;
      }

      const symbolProfile = symbolProfiles.find(
        ({ symbol: symbolProfileSymbol }) => {
          return symbolProfileSymbol === symbol;
        }
      );

      const symbolMapping = symbolProfile?.symbolMapping;

      let enhancedAssetProfile = symbolProfile
        ? {
            ...assetProfile,
            assetClass: symbolProfile.assetClass ?? assetProfile.assetClass,
            assetSubClass:
              symbolProfile.assetSubClass ?? assetProfile.assetSubClass
          }
        : assetProfile;

      for (const dataEnhancer of this.dataEnhancers) {
        try {
          enhancedAssetProfile = await dataEnhancer.enhance({
            response: enhancedAssetProfile,
            symbol: symbolMapping?.[dataEnhancer.getName()] ?? symbol
          });
        } catch (error) {
          this.logger.error(
            `Failed to enhance data for ${symbol} (${dataSource}) by ${dataEnhancer.getName()}`,
            error
          );
        }
      }

      const { assetClass, assetSubClass } = assetProfile;

      const {
        countries,
        currency,
        cusip,
        figi,
        figiComposite,
        figiShareClass,
        holdings,
        isin,
        name,
        sectors,
        url
      } = enhancedAssetProfile;

      try {
        await this.prismaService.symbolProfile.upsert({
          create: {
            assetClass,
            assetSubClass,
            countries,
            currency,
            cusip,
            dataSource,
            figi,
            figiComposite,
            figiShareClass,
            holdings,
            isin,
            name,
            sectors,
            symbol,
            url
          },
          update: {
            assetClass,
            assetSubClass,
            countries,
            currency,
            cusip,
            figi,
            figiComposite,
            figiShareClass,
            holdings,
            isin,
            name,
            sectors,
            url
          },
          where: {
            dataSource_symbol: {
              dataSource,
              symbol
            }
          }
        });
      } catch (error) {
        this.logger.error(`${symbol}: ${error?.meta?.cause}`, error);

        if (assetProfileIdentifiers.length === 1) {
          throw error;
        }
      }
    }
  }

  public async gatherHourlyMarketData() {
    try {
      await this.exchangeRateDataService.loadCurrencies();
    } catch (error) {
      this.logger.error('Could not gather exchange rates', error);
    }

    const assetProfileIdentifiers =
      await this.getHourlyAssetProfileIdentifiers();

    if (assetProfileIdentifiers.length <= 0) {
      return;
    }

    const date = getStartOfUtcDate(new Date());

    try {
      const quotes = await this.dataProviderService.getQuotes({
        items: assetProfileIdentifiers,
        useCache: false
      });

      const data: Prisma.MarketDataUpdateInput[] = [];

      for (const { dataSource, symbol } of assetProfileIdentifiers) {
        const quote = quotes[getAssetProfileIdentifier({ dataSource, symbol })];

        if (!quote?.marketPrice) {
          continue;
        }

        data.push({
          dataSource,
          date,
          symbol,
          marketPrice: quote.marketPrice,
          state: 'INTRADAY'
        });
      }

      await this.marketDataService.updateMany({ data });
    } catch (error) {
      this.logger.error('Could not gather hourly market data', error);
    }
  }

  public async gatherMax() {
    const dataGatheringItems = await this.getSymbolsMax();
    await this.gatherSymbols({
      dataGatheringItems,
      priority: DATA_GATHERING_QUEUE_PRIORITY_LOW
    });
  }

  public async gatherRecentMarketData() {
    await this.dataGatheringQueue.clean(
      GATHER_HISTORICAL_MARKET_DATA_COOLDOWN_IN_MS,
      'completed'
    );

    const removeOnComplete = {
      age: GATHER_HISTORICAL_MARKET_DATA_COOLDOWN_IN_MS / 1000
    };

    const assetProfileIdentifiersWithRecentMarketData =
      await this.getAssetProfileIdentifiersWithRecentMarketData();

    await this.gatherSymbols({
      removeOnComplete,
      dataGatheringItems: this.getCurrencies7D({
        assetProfileIdentifiersWithRecentMarketData
      }),
      priority: DATA_GATHERING_QUEUE_PRIORITY_HIGH
    });

    await this.gatherSymbols({
      removeOnComplete,
      dataGatheringItems: await this.getSymbols7D({
        assetProfileIdentifiersWithRecentMarketData,
        withUserSubscription: true
      }),
      priority: DATA_GATHERING_QUEUE_PRIORITY_MEDIUM
    });

    await this.gatherSymbols({
      removeOnComplete,
      dataGatheringItems: await this.getSymbols7D({
        assetProfileIdentifiersWithRecentMarketData,
        withUserSubscription: false
      }),
      priority: DATA_GATHERING_QUEUE_PRIORITY_LOW
    });
  }

  public async gatherSymbol({
    dataSource,
    date,
    force = true,
    symbol
  }: DataGatheringItem) {
    const dataGatheringItems = (await this.getSymbolsMax())
      .filter((dataGatheringItem) => {
        return (
          dataGatheringItem.dataSource === dataSource &&
          dataGatheringItem.symbol === symbol
        );
      })
      .map((item) => ({
        ...item,
        date: date ?? item.date
      }));

    return this.gatherSymbols({
      dataGatheringItems,
      force,
      priority: DATA_GATHERING_QUEUE_PRIORITY_HIGH
    });
  }

  public async gatherSymbolForDate({
    dataSource,
    date,
    symbol
  }: { date: Date } & AssetProfileIdentifier) {
    const startOfUtcDate = getStartOfUtcDate(date);

    try {
      const historicalData = await this.dataProviderService.getHistoricalRaw({
        assetProfileIdentifiers: [{ dataSource, symbol }],
        from: startOfUtcDate,
        to: startOfUtcDate
      });

      const marketPrice =
        historicalData[getAssetProfileIdentifier({ dataSource, symbol })]?.[
          format(startOfUtcDate, DATE_FORMAT, { in: utc })
        ]?.marketPrice;

      if (marketPrice) {
        return await this.prismaService.marketData.upsert({
          create: {
            dataSource,
            marketPrice,
            symbol,
            date: startOfUtcDate,
            isCarriedForward: false
          },
          update: { marketPrice, isCarriedForward: false },
          where: {
            dataSource_date_symbol: {
              dataSource,
              symbol,
              date: startOfUtcDate
            }
          }
        });
      }
    } catch (error) {
      this.logger.error(error?.message);
    }

    return undefined;
  }

  public async gatherSymbols({
    dataGatheringItems,
    force = false,
    priority,
    removeOnComplete = GATHER_HISTORICAL_MARKET_DATA_PROCESS_JOB_OPTIONS.removeOnComplete
  }: {
    dataGatheringItems: DataGatheringItem[];
    force?: boolean;
    priority: number;
    removeOnComplete?: JobOptions['removeOnComplete'];
  }): Promise<Job[]> {
    return this.addJobsToQueue(
      dataGatheringItems.map(({ dataSource, date, symbol }) => {
        return {
          data: {
            dataSource,
            date,
            force,
            symbol
          },
          name: GATHER_HISTORICAL_MARKET_DATA_PROCESS_JOB_NAME,
          opts: {
            ...GATHER_HISTORICAL_MARKET_DATA_PROCESS_JOB_OPTIONS,
            priority,
            removeOnComplete,
            jobId: `${getAssetProfileIdentifier({
              dataSource,
              symbol
            })}-${format(date, DATE_FORMAT, { in: utc })}`
          }
        };
      })
    );
  }

  /**
   * Returns active asset profile identifiers
   *
   * @param {StringValue} maxAge - Optional. Specifies the maximum allowed age
   * of a profile’s last update timestamp. Only asset profiles considered stale
   * are returned.
   */
  public async getActiveAssetProfileIdentifiers({
    maxAge
  }: {
    maxAge?: StringValue;
  } = {}): Promise<AssetProfileIdentifier[]> {
    return this.prismaService.symbolProfile.findMany({
      orderBy: [{ symbol: 'asc' }, { dataSource: 'asc' }],
      select: {
        dataSource: true,
        symbol: true
      },
      where: {
        dataSource: {
          notIn: ['MANUAL', 'RAPID_API']
        },
        isActive: true,
        ...(maxAge && {
          updatedAt: {
            lt: subMilliseconds(new Date(), ms(maxAge))
          }
        })
      }
    });
  }

  /**
   * Removes the asset profile job of a symbol from the queue
   */
  public async removeAssetProfileJobFromQueue({
    dataSource,
    symbol
  }: AssetProfileIdentifier) {
    const job = await this.dataGatheringQueue.getJob(
      `${getAssetProfileIdentifier({ dataSource, symbol })}:${dataSource}`
    );

    return job?.remove();
  }

  private async getAssetProfileIdentifiersWithRecentMarketData(): Promise<
    AssetProfileIdentifier[]
  > {
    return (
      await this.prismaService.marketData.groupBy({
        by: ['dataSource', 'symbol'],
        where: {
          date: {
            gte: getStartOfUtcDateOfYesterday()
          },
          isCarriedForward: false,
          state: 'CLOSE'
        }
      })
    ).map(({ dataSource, symbol }) => {
      return { dataSource, symbol };
    });
  }

  private getCurrencies7D({
    assetProfileIdentifiersWithRecentMarketData
  }: {
    assetProfileIdentifiersWithRecentMarketData: AssetProfileIdentifier[];
  }): DataGatheringItem[] {
    return this.exchangeRateDataService
      .getCurrencyPairs()
      .filter(({ dataSource, symbol }) => {
        return !assetProfileIdentifiersWithRecentMarketData.some((item) => {
          return item.dataSource === dataSource && item.symbol === symbol;
        });
      })
      .map(({ dataSource, symbol }) => {
        return {
          dataSource,
          symbol,
          date: subDays(getStartOfUtcDate(new Date()), 7, { in: utc })
        };
      });
  }

  private getEarliestDate(aStartDate: Date) {
    return min([aStartDate, subYears(new Date(), 10)]);
  }

  private async getHourlyAssetProfileIdentifiers(): Promise<
    AssetProfileIdentifier[]
  > {
    const symbolProfiles = await this.prismaService.symbolProfile.findMany({
      orderBy: [{ symbol: 'asc' }, { dataSource: 'asc' }],
      select: {
        dataSource: true,
        scraperConfiguration: true,
        symbol: true
      },
      where: {
        dataGatheringFrequency: 'HOURLY',
        isActive: true
      }
    });

    return symbolProfiles
      .filter(({ dataSource, scraperConfiguration }) => {
        const manualDataSourceWithScraperConfiguration =
          dataSource === 'MANUAL' && !isEmpty(scraperConfiguration);

        return (
          dataSource !== 'MANUAL' || manualDataSourceWithScraperConfiguration
        );
      })
      .map(({ dataSource, symbol }) => {
        return { dataSource, symbol };
      });
  }

  private async getSymbols7D({
    assetProfileIdentifiersWithRecentMarketData,
    withUserSubscription = false
  }: {
    assetProfileIdentifiersWithRecentMarketData: AssetProfileIdentifier[];
    withUserSubscription?: boolean;
  }): Promise<DataGatheringItem[]> {
    const symbolProfiles =
      await this.symbolProfileService.getActiveSymbolProfilesByUserSubscription(
        {
          withUserSubscription
        }
      );

    return symbolProfiles
      .filter(({ dataSource, scraperConfiguration, symbol }) => {
        const manualDataSourceWithScraperConfiguration =
          dataSource === 'MANUAL' && !isEmpty(scraperConfiguration);

        return (
          !assetProfileIdentifiersWithRecentMarketData.some((item) => {
            return item.dataSource === dataSource && item.symbol === symbol;
          }) &&
          (dataSource !== 'MANUAL' || manualDataSourceWithScraperConfiguration)
        );
      })
      .map((symbolProfile) => {
        return {
          ...symbolProfile,
          date: subDays(getStartOfUtcDate(new Date()), 7, { in: utc })
        };
      });
  }

  private async getSymbolsMax(): Promise<DataGatheringItem[]> {
    const benchmarkAssetProfileIdMap: { [key: string]: boolean } = {};
    (
      (await this.propertyService.getByKey<BenchmarkProperty[]>(
        PROPERTY_BENCHMARKS
      )) ?? []
    ).forEach(({ symbolProfileId }) => {
      benchmarkAssetProfileIdMap[symbolProfileId] = true;
    });
    const startDate =
      (
        await this.prismaService.order.findFirst({
          orderBy: [{ date: 'asc' }]
        })
      )?.date ?? new Date();

    const currencyPairsToGather = this.exchangeRateDataService
      .getCurrencyPairs()
      .map(({ dataSource, symbol }) => {
        return {
          dataSource,
          symbol,
          date: this.getEarliestDate(startDate)
        };
      });

    const symbolProfilesToGather = (
      await this.prismaService.symbolProfile.findMany({
        orderBy: [{ symbol: 'asc' }],
        select: {
          activities: {
            orderBy: [{ date: 'asc' }],
            select: { date: true },
            take: 1
          },
          dataSource: true,
          id: true,
          scraperConfiguration: true,
          symbol: true
        },
        where: {
          isActive: true
        }
      })
    )
      .filter(({ dataSource, scraperConfiguration }) => {
        const manualDataSourceWithScraperConfiguration =
          dataSource === 'MANUAL' && !isEmpty(scraperConfiguration);

        return (
          dataSource !== 'MANUAL' || manualDataSourceWithScraperConfiguration
        );
      })
      .map((symbolProfile) => {
        let date = symbolProfile.activities?.[0]?.date ?? startDate;

        if (benchmarkAssetProfileIdMap[symbolProfile.id]) {
          date = this.getEarliestDate(startDate);
        }

        return {
          ...symbolProfile,
          date
        };
      });

    return [...currencyPairsToGather, ...symbolProfilesToGather];
  }
}
