import {
  benchmarks,
  currencyPairs,
  ghostfolioFearAndGreedIndexSymbol
} from '@ghostfolio/common/config';
import {
  DATE_FORMAT,
  getUtc,
  isGhostfolioScraperApiSymbol,
  resetHours
} from '@ghostfolio/common/helper';
import { Injectable } from '@nestjs/common';
import { DataSource } from '@prisma/client';
import {
  differenceInHours,
  endOfToday,
  format,
  getDate,
  getMonth,
  getYear,
  isBefore,
  subDays
} from 'date-fns';

import { ConfigurationService } from './configuration.service';
import { DataProviderService } from './data-provider/data-provider.service';
import { GhostfolioScraperApiService } from './data-provider/ghostfolio-scraper-api/ghostfolio-scraper-api.service';
import { IDataGatheringItem } from './interfaces/interfaces';
import { PrismaService } from './prisma.service';

@Injectable()
export class DataGatheringService {
  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly dataProviderService: DataProviderService,
    private readonly ghostfolioScraperApi: GhostfolioScraperApiService,
    private readonly prismaService: PrismaService
  ) {}

  public async gather7Days() {
    const isDataGatheringNeeded = await this.isDataGatheringNeeded();

    if (isDataGatheringNeeded) {
      console.log('7d data gathering has been started.');
      console.time('data-gathering-7d');

      await this.prismaService.property.create({
        data: {
          key: 'LOCKED_DATA_GATHERING',
          value: new Date().toISOString()
        }
      });

      const symbols = await this.getSymbols7D();

      try {
        await this.gatherSymbols(symbols);

        await this.prismaService.property.upsert({
          create: {
            key: 'LAST_DATA_GATHERING',
            value: new Date().toISOString()
          },
          update: { value: new Date().toISOString() },
          where: { key: 'LAST_DATA_GATHERING' }
        });
      } catch (error) {
        console.error(error);
      }

      await this.prismaService.property.delete({
        where: {
          key: 'LOCKED_DATA_GATHERING'
        }
      });

      console.log('7d data gathering has been completed.');
      console.timeEnd('data-gathering-7d');
    }
  }

  public async gatherMax() {
    const isDataGatheringLocked = await this.prismaService.property.findUnique({
      where: { key: 'LOCKED_DATA_GATHERING' }
    });

    if (!isDataGatheringLocked) {
      console.log('Max data gathering has been started.');
      console.time('data-gathering-max');

      await this.prismaService.property.create({
        data: {
          key: 'LOCKED_DATA_GATHERING',
          value: new Date().toISOString()
        }
      });

      const symbols = await this.getSymbolsMax();

      try {
        await this.gatherSymbols(symbols);

        await this.prismaService.property.upsert({
          create: {
            key: 'LAST_DATA_GATHERING',
            value: new Date().toISOString()
          },
          update: { value: new Date().toISOString() },
          where: { key: 'LAST_DATA_GATHERING' }
        });
      } catch (error) {
        console.error(error);
      }

      await this.prismaService.property.delete({
        where: {
          key: 'LOCKED_DATA_GATHERING'
        }
      });

      console.log('Max data gathering has been completed.');
      console.timeEnd('data-gathering-max');
    }
  }

  public async gatherProfileData(aSymbols?: string[]) {
    console.log('Profile data gathering has been started.');
    console.time('data-gathering-profile');

    let symbols = aSymbols;

    if (!symbols) {
      const dataGatheringItems = await this.getSymbolsProfileData();
      symbols = dataGatheringItems.map((dataGatheringItem) => {
        return dataGatheringItem.symbol;
      });
    }

    const currentData = await this.dataProviderService.get(symbols);

    for (const [
      symbol,
      { assetClass, assetSubClass, countries, currency, dataSource, name }
    ] of Object.entries(currentData)) {
      try {
        await this.prismaService.symbolProfile.upsert({
          create: {
            assetClass,
            assetSubClass,
            countries,
            currency,
            dataSource,
            name,
            symbol
          },
          update: {
            assetClass,
            assetSubClass,
            countries,
            currency,
            name
          },
          where: {
            dataSource_symbol: {
              dataSource,
              symbol
            }
          }
        });
      } catch (error) {
        console.error(`${symbol}: ${error?.meta?.cause}`);
      }
    }

    console.log('Profile data gathering has been completed.');
    console.timeEnd('data-gathering-profile');
  }

  public async gatherSymbols(aSymbolsWithStartDate: IDataGatheringItem[]) {
    let hasError = false;

    for (const { dataSource, date, symbol } of aSymbolsWithStartDate) {
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
        console.error(error);
      }
    }

    if (hasError) {
      throw '';
    }
  }

  public async getCustomSymbolsToGather(
    startDate?: Date
  ): Promise<IDataGatheringItem[]> {
    const scraperConfigurations =
      await this.ghostfolioScraperApi.getScraperConfigurations();

    return scraperConfigurations.map((scraperConfiguration) => {
      return {
        dataSource: DataSource.GHOSTFOLIO,
        date: startDate,
        symbol: scraperConfiguration.symbol
      };
    });
  }

  public async getIsInProgress() {
    return await this.prismaService.property.findUnique({
      where: { key: 'LOCKED_DATA_GATHERING' }
    });
  }

  public async getLastDataGathering() {
    const lastDataGathering = await this.prismaService.property.findUnique({
      where: { key: 'LAST_DATA_GATHERING' }
    });

    if (lastDataGathering?.value) {
      return new Date(lastDataGathering.value);
    }

    return undefined;
  }

  public async reset() {
    console.log('Data gathering has been reset.');

    await this.prismaService.property.deleteMany({
      where: {
        OR: [{ key: 'LAST_DATA_GATHERING' }, { key: 'LOCKED_DATA_GATHERING' }]
      }
    });
  }

  private getBenchmarksToGather(startDate: Date): IDataGatheringItem[] {
    const benchmarksToGather = benchmarks.map(({ dataSource, symbol }) => {
      return {
        dataSource,
        symbol,
        date: startDate
      };
    });

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

    const distinctOrders = await this.prismaService.order.findMany({
      distinct: ['symbol'],
      orderBy: [{ symbol: 'asc' }],
      select: { dataSource: true, symbol: true },
      where: {
        date: {
          lt: endOfToday() // no draft
        }
      }
    });

    const distinctOrdersWithDate: IDataGatheringItem[] = distinctOrders
      .filter((distinctOrder) => {
        return !isGhostfolioScraperApiSymbol(distinctOrder.symbol);
      })
      .map((distinctOrder) => {
        return {
          ...distinctOrder,
          date: startDate
        };
      });

    const currencyPairsToGather = currencyPairs.map(
      ({ dataSource, symbol }) => {
        return {
          dataSource,
          symbol,
          date: startDate
        };
      }
    );

    const customSymbolsToGather =
      await this.ghostfolioScraperApi.getCustomSymbolsToGather(startDate);

    return [
      ...this.getBenchmarksToGather(startDate),
      ...customSymbolsToGather,
      ...currencyPairsToGather,
      ...distinctOrdersWithDate
    ];
  }

  private async getSymbolsMax(): Promise<IDataGatheringItem[]> {
    const startDate = new Date(getUtc('2015-01-01'));

    const customSymbolsToGather =
      await this.ghostfolioScraperApi.getCustomSymbolsToGather(startDate);

    const currencyPairsToGather = currencyPairs.map(
      ({ dataSource, symbol }) => {
        return {
          dataSource,
          symbol,
          date: startDate
        };
      }
    );

    const distinctOrders = await this.prismaService.order.findMany({
      distinct: ['symbol'],
      orderBy: [{ date: 'asc' }],
      select: { dataSource: true, date: true, symbol: true },
      where: {
        date: {
          lt: endOfToday() // no draft
        }
      }
    });

    return [
      ...this.getBenchmarksToGather(startDate),
      ...customSymbolsToGather,
      ...currencyPairsToGather,
      ...distinctOrders
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
      where: { key: 'LOCKED_DATA_GATHERING' }
    });

    const diffInHours = differenceInHours(new Date(), lastDataGathering);

    return (diffInHours >= 1 || !lastDataGathering) && !isDataGatheringLocked;
  }
}
