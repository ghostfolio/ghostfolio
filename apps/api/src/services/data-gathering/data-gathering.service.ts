import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { DataEnhancerInterface } from '@ghostfolio/api/services/data-provider/interfaces/data-enhancer.interface';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { IDataGatheringItem } from '@ghostfolio/api/services/interfaces/interfaces';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import {
  DATA_GATHERING_QUEUE,
  DATA_GATHERING_QUEUE_PRIORITY_HIGH,
  DATA_GATHERING_QUEUE_PRIORITY_LOW,
  DATA_GATHERING_QUEUE_PRIORITY_MEDIUM,
  GATHER_HISTORICAL_MARKET_DATA_PROCESS,
  GATHER_HISTORICAL_MARKET_DATA_PROCESS_OPTIONS,
  PROPERTY_BENCHMARKS
} from '@ghostfolio/common/config';
import {
  DATE_FORMAT,
  getAssetProfileIdentifier,
  resetHours
} from '@ghostfolio/common/helper';
import { BenchmarkProperty, UniqueAsset } from '@ghostfolio/common/interfaces';

import { InjectQueue } from '@nestjs/bull';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource } from '@prisma/client';
import { JobOptions, Queue } from 'bull';
import { format, min, subDays, subYears } from 'date-fns';
import { isEmpty } from 'lodash';

@Injectable()
export class DataGatheringService {
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

  public async gather7Days() {
    await this.gatherSymbols({
      dataGatheringItems: await this.getCurrencies7D(),
      priority: DATA_GATHERING_QUEUE_PRIORITY_HIGH
    });

    await this.gatherSymbols({
      dataGatheringItems: await this.getSymbols7D({
        withUserSubscription: true
      }),
      priority: DATA_GATHERING_QUEUE_PRIORITY_MEDIUM
    });

    await this.gatherSymbols({
      dataGatheringItems: await this.getSymbols7D({
        withUserSubscription: false
      }),
      priority: DATA_GATHERING_QUEUE_PRIORITY_LOW
    });
  }

  public async gatherMax() {
    const dataGatheringItems = await this.getSymbolsMax();
    await this.gatherSymbols({
      dataGatheringItems,
      priority: DATA_GATHERING_QUEUE_PRIORITY_LOW
    });
  }

  public async gatherSymbol({ dataSource, symbol }: UniqueAsset) {
    await this.marketDataService.deleteMany({ dataSource, symbol });

    const dataGatheringItems = (await this.getSymbolsMax()).filter(
      (dataGatheringItem) => {
        return (
          dataGatheringItem.dataSource === dataSource &&
          dataGatheringItem.symbol === symbol
        );
      }
    );
    await this.gatherSymbols({
      dataGatheringItems,
      priority: DATA_GATHERING_QUEUE_PRIORITY_HIGH
    });
  }

  public async gatherSymbolForDate({
    dataSource,
    date,
    symbol
  }: {
    dataSource: DataSource;
    date: Date;
    symbol: string;
  }) {
    try {
      const historicalData = await this.dataProviderService.getHistoricalRaw({
        dataGatheringItems: [{ dataSource, symbol }],
        from: date,
        to: date
      });

      const marketPrice =
        historicalData[symbol][format(date, DATE_FORMAT)].marketPrice;

      if (marketPrice) {
        return await this.prismaService.marketData.upsert({
          create: {
            dataSource,
            date,
            marketPrice,
            symbol
          },
          update: { marketPrice },
          where: { dataSource_date_symbol: { dataSource, date, symbol } }
        });
      }
    } catch (error) {
      Logger.error(error, 'DataGatheringService');
    } finally {
      return undefined;
    }
  }

  public async gatherAssetProfiles(aUniqueAssets?: UniqueAsset[]) {
    let uniqueAssets = aUniqueAssets?.filter((dataGatheringItem) => {
      return dataGatheringItem.dataSource !== 'MANUAL';
    });

    if (!uniqueAssets) {
      uniqueAssets = await this.getUniqueAssets();
    }

    if (uniqueAssets.length <= 0) {
      return;
    }

    const assetProfiles =
      await this.dataProviderService.getAssetProfiles(uniqueAssets);
    const symbolProfiles =
      await this.symbolProfileService.getSymbolProfiles(uniqueAssets);

    for (const [symbol, assetProfile] of Object.entries(assetProfiles)) {
      const symbolMapping = symbolProfiles.find((symbolProfile) => {
        return symbolProfile.symbol === symbol;
      })?.symbolMapping;

      for (const dataEnhancer of this.dataEnhancers) {
        try {
          assetProfiles[symbol] = await dataEnhancer.enhance({
            response: assetProfile,
            symbol: symbolMapping?.[dataEnhancer.getName()] ?? symbol
          });
        } catch (error) {
          Logger.error(
            `Failed to enhance data for ${symbol} (${
              assetProfile.dataSource
            }) by ${dataEnhancer.getName()}`,
            error,
            'DataGatheringService'
          );
        }
      }

      const {
        assetClass,
        assetSubClass,
        countries,
        currency,
        dataSource,
        figi,
        figiComposite,
        figiShareClass,
        holdings,
        isin,
        name,
        sectors,
        url
      } = assetProfile;

      try {
        await this.prismaService.symbolProfile.upsert({
          create: {
            assetClass,
            assetSubClass,
            countries,
            currency,
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
        Logger.error(
          `${symbol}: ${error?.meta?.cause}`,
          error,
          'DataGatheringService'
        );

        if (uniqueAssets.length === 1) {
          throw error;
        }
      }
    }
  }

  public async gatherSymbols({
    dataGatheringItems,
    priority
  }: {
    dataGatheringItems: IDataGatheringItem[];
    priority: number;
  }) {
    await this.addJobsToQueue(
      dataGatheringItems.map(({ dataSource, date, symbol }) => {
        return {
          data: {
            dataSource,
            date,
            symbol
          },
          name: GATHER_HISTORICAL_MARKET_DATA_PROCESS,
          opts: {
            ...GATHER_HISTORICAL_MARKET_DATA_PROCESS_OPTIONS,
            priority,
            jobId: `${getAssetProfileIdentifier({
              dataSource,
              symbol
            })}-${format(date, DATE_FORMAT)}`
          }
        };
      })
    );
  }

  public async getUniqueAssets(): Promise<UniqueAsset[]> {
    const symbolProfiles = await this.prismaService.symbolProfile.findMany({
      orderBy: [{ symbol: 'asc' }]
    });

    return symbolProfiles
      .filter(({ dataSource }) => {
        return (
          dataSource !== DataSource.MANUAL &&
          dataSource !== DataSource.RAPID_API
        );
      })
      .map(({ dataSource, symbol }) => {
        return {
          dataSource,
          symbol
        };
      });
  }

  private async getCurrencies7D(): Promise<IDataGatheringItem[]> {
    const startDate = subDays(resetHours(new Date()), 7);

    const symbolsWithCompleteMarketData =
      await this.getSymbolsWithCompleteMarketData();

    return this.exchangeRateDataService
      .getCurrencyPairs()
      .filter(({ symbol }) => {
        return !symbolsWithCompleteMarketData.includes(symbol);
      })
      .map(({ dataSource, symbol }) => {
        return {
          dataSource,
          symbol,
          date: startDate
        };
      });
  }

  private getEarliestDate(aStartDate: Date) {
    return min([aStartDate, subYears(new Date(), 10)]);
  }

  private async getSymbols7D({
    withUserSubscription = false
  }: {
    withUserSubscription?: boolean;
  }): Promise<IDataGatheringItem[]> {
    const startDate = subDays(resetHours(new Date()), 7);

    const symbolProfiles =
      await this.symbolProfileService.getSymbolProfilesByUserSubscription({
        withUserSubscription
      });

    const symbolsWithCompleteMarketData =
      await this.getSymbolsWithCompleteMarketData();

    return symbolProfiles
      .filter(({ dataSource, scraperConfiguration, symbol }) => {
        const manualDataSourceWithScraperConfiguration =
          dataSource === 'MANUAL' && !isEmpty(scraperConfiguration);

        return (
          !symbolsWithCompleteMarketData.includes(symbol) &&
          (dataSource !== 'MANUAL' || manualDataSourceWithScraperConfiguration)
        );
      })
      .map((symbolProfile) => {
        return {
          ...symbolProfile,
          date: startDate
        };
      });
  }

  private async getSymbolsMax(): Promise<IDataGatheringItem[]> {
    const benchmarkAssetProfileIdMap: { [key: string]: boolean } = {};
    (
      ((await this.propertyService.getByKey(
        PROPERTY_BENCHMARKS
      )) as BenchmarkProperty[]) ?? []
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
          dataSource: true,
          id: true,
          Order: {
            orderBy: [{ date: 'asc' }],
            select: { date: true },
            take: 1
          },
          scraperConfiguration: true,
          symbol: true
        }
      })
    )
      .filter((symbolProfile) => {
        const manualDataSourceWithScraperConfiguration =
          symbolProfile.dataSource === 'MANUAL' &&
          !isEmpty(symbolProfile.scraperConfiguration);

        return (
          symbolProfile.dataSource !== 'MANUAL' ||
          manualDataSourceWithScraperConfiguration
        );
      })
      .map((symbolProfile) => {
        let date = symbolProfile.Order?.[0]?.date ?? startDate;

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

  private async getSymbolsWithCompleteMarketData() {
    const startDate = subDays(resetHours(new Date()), 7);

    return (
      await this.prismaService.marketData.groupBy({
        _count: true,
        by: ['symbol'],
        orderBy: [{ symbol: 'asc' }],
        where: {
          date: { gt: startDate },
          state: 'CLOSE'
        }
      })
    )
      .filter(({ _count }) => {
        return _count >= 6;
      })
      .map(({ symbol }) => {
        return symbol;
      });
  }
}
