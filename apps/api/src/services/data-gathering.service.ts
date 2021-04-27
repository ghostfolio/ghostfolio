import {
  benchmarks,
  currencyPairs,
  getUtc,
  isGhostfolioScraperApiSymbol,
  resetHours
} from '@ghostfolio/helper';
import { Injectable } from '@nestjs/common';
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
import { DataProviderService } from './data-provider.service';
import { GhostfolioScraperApiService } from './data-provider/ghostfolio-scraper-api/ghostfolio-scraper-api.service';
import { PrismaService } from './prisma.service';

@Injectable()
export class DataGatheringService {
  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly dataProviderService: DataProviderService,
    private readonly ghostfolioScraperApi: GhostfolioScraperApiService,
    private prisma: PrismaService
  ) {}

  public async gather7Days() {
    const isDataGatheringNeeded = await this.isDataGatheringNeeded();

    if (isDataGatheringNeeded) {
      console.log('7d data gathering has been started.');
      console.time('data-gathering');

      await this.prisma.property.create({
        data: {
          key: 'LOCKED_DATA_GATHERING',
          value: new Date().toISOString()
        }
      });

      const symbols = await this.getSymbols7D();

      try {
        await this.gatherSymbols(symbols);

        await this.prisma.property.upsert({
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

      await this.prisma.property.delete({
        where: {
          key: 'LOCKED_DATA_GATHERING'
        }
      });

      console.log('7d data gathering has been completed.');
      console.timeEnd('data-gathering');
    }
  }

  public async gatherMax() {
    const isDataGatheringLocked = await this.prisma.property.findUnique({
      where: { key: 'LOCKED_DATA_GATHERING' }
    });

    if (!isDataGatheringLocked) {
      console.log('Max data gathering has been started.');
      console.time('data-gathering');

      await this.prisma.property.create({
        data: {
          key: 'LOCKED_DATA_GATHERING',
          value: new Date().toISOString()
        }
      });

      const symbols = await this.getSymbolsMax();

      try {
        await this.gatherSymbols(symbols);

        await this.prisma.property.upsert({
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

      await this.prisma.property.delete({
        where: {
          key: 'LOCKED_DATA_GATHERING'
        }
      });

      console.log('Max data gathering has been completed.');
      console.timeEnd('data-gathering');
    }
  }

  public async gatherSymbols(
    aSymbolsWithStartDate: { date: Date; symbol: string }[]
  ) {
    let hasError = false;

    for (const { date, symbol } of aSymbolsWithStartDate) {
      try {
        const historicalData = await this.dataProviderService.getHistoricalRaw(
          [symbol],
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
            historicalData[symbol]?.[format(currentDate, 'yyyy-MM-dd')]
              ?.marketPrice
          ) {
            lastMarketPrice =
              historicalData[symbol]?.[format(currentDate, 'yyyy-MM-dd')]
                ?.marketPrice;
          }

          try {
            await this.prisma.marketData.create({
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

  public async getCustomSymbolsToGather(startDate?: Date) {
    const scraperConfigurations = await this.ghostfolioScraperApi.getScraperConfigurations();

    return scraperConfigurations.map((scraperConfiguration) => {
      return {
        date: startDate,
        symbol: scraperConfiguration.symbol
      };
    });
  }

  private getBenchmarksToGather(startDate: Date) {
    const benchmarksToGather = benchmarks.map((symbol) => {
      return {
        symbol,
        date: startDate
      };
    });

    if (this.configurationService.get('ENABLE_FEATURE_FEAR_AND_GREED_INDEX')) {
      benchmarksToGather.push({
        date: startDate,
        symbol: 'GF.FEAR_AND_GREED_INDEX'
      });
    }

    return benchmarksToGather;
  }

  private async getSymbols7D(): Promise<{ date: Date; symbol: string }[]> {
    const startDate = subDays(resetHours(new Date()), 7);

    const distinctOrders = await this.prisma.order.findMany({
      distinct: ['symbol'],
      orderBy: [{ symbol: 'asc' }],
      select: { symbol: true }
    });

    const distinctOrdersWithDate = distinctOrders
      .filter((distinctOrder) => {
        return !isGhostfolioScraperApiSymbol(distinctOrder.symbol);
      })
      .map((distinctOrder) => {
        return {
          ...distinctOrder,
          date: startDate
        };
      });

    const currencyPairsToGather = currencyPairs.map((symbol) => {
      return {
        symbol,
        date: startDate
      };
    });

    const customSymbolsToGather = await this.getCustomSymbolsToGather(
      startDate
    );

    return [
      ...this.getBenchmarksToGather(startDate),
      ...customSymbolsToGather,
      ...currencyPairsToGather,
      ...distinctOrdersWithDate
    ];
  }

  private async getSymbolsMax() {
    const startDate = new Date(getUtc('2015-01-01'));

    const customSymbolsToGather = await this.getCustomSymbolsToGather(
      startDate
    );

    const currencyPairsToGather = currencyPairs.map((symbol) => {
      return {
        symbol,
        date: startDate
      };
    });

    const distinctOrders = await this.prisma.order.findMany({
      distinct: ['symbol'],
      orderBy: [{ date: 'asc' }],
      select: { date: true, symbol: true }
    });

    return [
      ...this.getBenchmarksToGather(startDate),
      ...customSymbolsToGather,
      ...currencyPairsToGather,
      ...distinctOrders
    ];
  }

  private async isDataGatheringNeeded() {
    const lastDataGathering = await this.prisma.property.findUnique({
      where: { key: 'LAST_DATA_GATHERING' }
    });

    const isDataGatheringLocked = await this.prisma.property.findUnique({
      where: { key: 'LOCKED_DATA_GATHERING' }
    });

    const diffInHours = differenceInHours(
      new Date(),
      new Date(lastDataGathering?.value)
    );

    return (diffInHours >= 1 || !lastDataGathering) && !isDataGatheringLocked;
  }
}
