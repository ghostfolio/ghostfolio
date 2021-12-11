import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile.service';
import {
  PROPERTY_LAST_DATA_GATHERING,
  PROPERTY_LOCKED_DATA_GATHERING,
  ghostfolioFearAndGreedIndexSymbol
} from '@ghostfolio/common/config';
import { DATE_FORMAT, resetHours } from '@ghostfolio/common/helper';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource, MarketData } from '@prisma/client';
import {
  differenceInHours,
  format,
  getDate,
  getMonth,
  getYear,
  isBefore,
  subDays
} from 'date-fns';

import { ConfigurationService } from './configuration.service';
import { DataProviderService } from './data-provider/data-provider.service';
import { DataEnhancerInterface } from './data-provider/interfaces/data-enhancer.interface';
import { ExchangeRateDataService } from './exchange-rate-data.service';
import { IDataGatheringItem } from './interfaces/interfaces';
import { PrismaService } from './prisma.service';

@Injectable()
export class DataGatheringService {
  private dataGatheringProgress: number;

  public constructor(
    private readonly configurationService: ConfigurationService,
    @Inject('DataEnhancers')
    private readonly dataEnhancers: DataEnhancerInterface[],
    private readonly dataProviderService: DataProviderService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly prismaService: PrismaService,
    private readonly symbolProfileService: SymbolProfileService
  ) {}

  public async gather7Days() {
    const isDataGatheringNeeded = await this.isDataGatheringNeeded();

    if (isDataGatheringNeeded) {
      Logger.log('7d data gathering has been started.');
      console.time('data-gathering-7d');

      await this.prismaService.property.create({
        data: {
          key: PROPERTY_LOCKED_DATA_GATHERING,
          value: new Date().toISOString()
        }
      });

      const symbols = await this.getSymbols7D();

      try {
        await this.gatherSymbols(symbols);

        await this.prismaService.property.upsert({
          create: {
            key: PROPERTY_LAST_DATA_GATHERING,
            value: new Date().toISOString()
          },
          update: { value: new Date().toISOString() },
          where: { key: PROPERTY_LAST_DATA_GATHERING }
        });
      } catch (error) {
        Logger.error(error);
      }

      await this.prismaService.property.delete({
        where: {
          key: PROPERTY_LOCKED_DATA_GATHERING
        }
      });

      Logger.log('7d data gathering has been completed.');
      console.timeEnd('data-gathering-7d');
    }
  }

  public async gatherMax() {
    const isDataGatheringLocked = await this.prismaService.property.findUnique({
      where: { key: PROPERTY_LOCKED_DATA_GATHERING }
    });

    if (!isDataGatheringLocked) {
      Logger.log('Max data gathering has been started.');
      console.time('data-gathering-max');

      await this.prismaService.property.create({
        data: {
          key: PROPERTY_LOCKED_DATA_GATHERING,
          value: new Date().toISOString()
        }
      });

      const symbols = await this.getSymbolsMax();

      try {
        await this.gatherSymbols(symbols);

        await this.prismaService.property.upsert({
          create: {
            key: PROPERTY_LAST_DATA_GATHERING,
            value: new Date().toISOString()
          },
          update: { value: new Date().toISOString() },
          where: { key: PROPERTY_LAST_DATA_GATHERING }
        });
      } catch (error) {
        Logger.error(error);
      }

      await this.prismaService.property.delete({
        where: {
          key: PROPERTY_LOCKED_DATA_GATHERING
        }
      });

      Logger.log('Max data gathering has been completed.');
      console.timeEnd('data-gathering-max');
    }
  }

  public async gatherSymbol({
    dataSource,
    symbol
  }: {
    dataSource: DataSource;
    symbol: string;
  }) {
    const isDataGatheringLocked = await this.prismaService.property.findUnique({
      where: { key: PROPERTY_LOCKED_DATA_GATHERING }
    });

    if (!isDataGatheringLocked) {
      Logger.log(`Symbol data gathering for ${symbol} has been started.`);
      console.time('data-gathering-symbol');

      await this.prismaService.property.create({
        data: {
          key: PROPERTY_LOCKED_DATA_GATHERING,
          value: new Date().toISOString()
        }
      });

      const symbols = (await this.getSymbolsMax()).filter(
        (dataGatheringItem) => {
          return (
            dataGatheringItem.dataSource === dataSource &&
            dataGatheringItem.symbol === symbol
          );
        }
      );

      try {
        await this.gatherSymbols(symbols);

        await this.prismaService.property.upsert({
          create: {
            key: PROPERTY_LAST_DATA_GATHERING,
            value: new Date().toISOString()
          },
          update: { value: new Date().toISOString() },
          where: { key: PROPERTY_LAST_DATA_GATHERING }
        });
      } catch (error) {
        Logger.error(error);
      }

      await this.prismaService.property.delete({
        where: {
          key: PROPERTY_LOCKED_DATA_GATHERING
        }
      });

      Logger.log(`Symbol data gathering for ${symbol} has been completed.`);
      console.timeEnd('data-gathering-symbol');
    }
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
      const historicalData = await this.dataProviderService.getHistoricalRaw(
        [{ dataSource, symbol }],
        date,
        date
      );

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
          where: { date_symbol: { date, symbol } }
        });
      }
    } catch (error) {
      Logger.error(error);
    } finally {
      return undefined;
    }
  }

  public async gatherProfileData(aDataGatheringItems?: IDataGatheringItem[]) {
    Logger.log('Profile data gathering has been started.');
    console.time('data-gathering-profile');

    let dataGatheringItems = aDataGatheringItems;

    if (!dataGatheringItems) {
      dataGatheringItems = await this.getSymbolsProfileData();
    }

    const currentData = await this.dataProviderService.get(dataGatheringItems);
    const symbolProfiles = await this.symbolProfileService.getSymbolProfiles(
      dataGatheringItems.map(({ symbol }) => {
        return symbol;
      })
    );

    for (const [symbol, response] of Object.entries(currentData)) {
      const symbolMapping = symbolProfiles.find((symbolProfile) => {
        return symbolProfile.symbol === symbol;
      })?.symbolMapping;

      for (const dataEnhancer of this.dataEnhancers) {
        try {
          currentData[symbol] = await dataEnhancer.enhance({
            response,
            symbol: symbolMapping[dataEnhancer.getName()] ?? symbol
          });
        } catch (error) {
          Logger.error(`Failed to enhance data for symbol ${symbol}`, error);
        }
      }

      const {
        assetClass,
        assetSubClass,
        countries,
        currency,
        dataSource,
        name,
        sectors
      } = currentData[symbol];

      try {
        await this.prismaService.symbolProfile.upsert({
          create: {
            assetClass,
            assetSubClass,
            countries,
            currency,
            dataSource,
            name,
            sectors,
            symbol
          },
          update: {
            assetClass,
            assetSubClass,
            countries,
            currency,
            name,
            sectors
          },
          where: {
            dataSource_symbol: {
              dataSource,
              symbol
            }
          }
        });
      } catch (error) {
        Logger.error(`${symbol}: ${error?.meta?.cause}`);
      }
    }

    Logger.log('Profile data gathering has been completed.');
    console.timeEnd('data-gathering-profile');
  }

  public async gatherSymbols(aSymbolsWithStartDate: IDataGatheringItem[]) {
    let hasError = false;
    let symbolCounter = 0;

    for (const { dataSource, date, symbol } of aSymbolsWithStartDate) {
      this.dataGatheringProgress = symbolCounter / aSymbolsWithStartDate.length;

      try {
        const historicalData = await this.dataProviderService.getHistoricalRaw(
          [{ dataSource, symbol }],
          date,
          new Date()
        );

        let currentDate = date;
        let lastMarketPrice: number;

        while (
          isBefore(
            currentDate,
            new Date(
              Date.UTC(
                getYear(new Date()),
                getMonth(new Date()),
                getDate(new Date()),
                0
              )
            )
          )
        ) {
          if (
            historicalData[symbol]?.[format(currentDate, DATE_FORMAT)]
              ?.marketPrice
          ) {
            lastMarketPrice =
              historicalData[symbol]?.[format(currentDate, DATE_FORMAT)]
                ?.marketPrice;
          }

          try {
            await this.prismaService.marketData.create({
              data: {
                dataSource,
                symbol,
                date: currentDate,
                marketPrice: lastMarketPrice
              }
            });
          } catch {}

          // Count month one up for iteration
          currentDate = new Date(
            Date.UTC(
              getYear(currentDate),
              getMonth(currentDate),
              getDate(currentDate) + 1,
              0
            )
          );
        }
      } catch (error) {
        hasError = true;
        Logger.error(error);
      }

      if (symbolCounter > 0 && symbolCounter % 100 === 0) {
        Logger.log(
          `Data gathering progress: ${(
            this.dataGatheringProgress * 100
          ).toFixed(2)}%`
        );
      }

      symbolCounter += 1;
    }

    await this.exchangeRateDataService.initialize();

    if (hasError) {
      throw '';
    }
  }

  public async getDataGatheringProgress() {
    const isInProgress = await this.getIsInProgress();

    if (isInProgress) {
      return this.dataGatheringProgress;
    }

    return undefined;
  }

  public async getIsInProgress() {
    return await this.prismaService.property.findUnique({
      where: { key: PROPERTY_LOCKED_DATA_GATHERING }
    });
  }

  public async getLastDataGathering() {
    const lastDataGathering = await this.prismaService.property.findUnique({
      where: { key: PROPERTY_LAST_DATA_GATHERING }
    });

    if (lastDataGathering?.value) {
      return new Date(lastDataGathering.value);
    }

    return undefined;
  }

  public async getSymbolsMax(): Promise<IDataGatheringItem[]> {
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
          date: startDate
        };
      });

    const symbolProfilesToGather = (
      await this.prismaService.symbolProfile.findMany({
        orderBy: [{ symbol: 'asc' }],
        select: {
          dataSource: true,
          Order: {
            orderBy: [{ date: 'asc' }],
            select: { date: true },
            take: 1
          },
          scraperConfiguration: true,
          symbol: true
        }
      })
    ).map((symbolProfile) => {
      return {
        ...symbolProfile,
        date: symbolProfile.Order?.[0]?.date ?? startDate
      };
    });

    return [
      ...this.getBenchmarksToGather(startDate),
      ...currencyPairsToGather,
      ...symbolProfilesToGather
    ];
  }

  public async reset() {
    Logger.log('Data gathering has been reset.');

    await this.prismaService.property.deleteMany({
      where: {
        OR: [
          { key: PROPERTY_LAST_DATA_GATHERING },
          { key: PROPERTY_LOCKED_DATA_GATHERING }
        ]
      }
    });
  }

  private getBenchmarksToGather(startDate: Date): IDataGatheringItem[] {
    const benchmarksToGather: IDataGatheringItem[] = [];

    if (this.configurationService.get('ENABLE_FEATURE_FEAR_AND_GREED_INDEX')) {
      benchmarksToGather.push({
        dataSource: DataSource.RAKUTEN,
        date: startDate,
        symbol: ghostfolioFearAndGreedIndexSymbol
      });
    }

    return benchmarksToGather;
  }

  private async getSymbols7D(): Promise<IDataGatheringItem[]> {
    const startDate = subDays(resetHours(new Date()), 7);

    const symbolProfilesToGather = (
      await this.prismaService.symbolProfile.findMany({
        orderBy: [{ symbol: 'asc' }],
        select: {
          dataSource: true,
          scraperConfiguration: true,
          symbol: true
        }
      })
    ).map((symbolProfile) => {
      return {
        ...symbolProfile,
        date: startDate
      };
    });

    const currencyPairsToGather = this.exchangeRateDataService
      .getCurrencyPairs()
      .map(({ dataSource, symbol }) => {
        return {
          dataSource,
          symbol,
          date: startDate
        };
      });

    return [
      ...this.getBenchmarksToGather(startDate),
      ...currencyPairsToGather,
      ...symbolProfilesToGather
    ];
  }

  private async getSymbolsProfileData(): Promise<IDataGatheringItem[]> {
    const startDate = subDays(resetHours(new Date()), 7);

    const distinctOrders = await this.prismaService.order.findMany({
      distinct: ['symbol'],
      orderBy: [{ symbol: 'asc' }],
      select: { dataSource: true, symbol: true }
    });

    return [...this.getBenchmarksToGather(startDate), ...distinctOrders].filter(
      (distinctOrder) => {
        return (
          distinctOrder.dataSource !== DataSource.GHOSTFOLIO &&
          distinctOrder.dataSource !== DataSource.RAKUTEN
        );
      }
    );
  }

  private async isDataGatheringNeeded() {
    const lastDataGathering = await this.getLastDataGathering();

    const isDataGatheringLocked = await this.prismaService.property.findUnique({
      where: { key: PROPERTY_LOCKED_DATA_GATHERING }
    });

    const diffInHours = differenceInHours(new Date(), lastDataGathering);

    return (diffInHours >= 1 || !lastDataGathering) && !isDataGatheringLocked;
  }
}
