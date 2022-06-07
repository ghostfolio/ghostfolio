import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile.service';
import {
  DATA_GATHERING_QUEUE,
  DATA_GATHERING_QUEUE_PRIORITY_LOW,
  GATHER_HISTORICAL_MARKET_DATA_PROCESS
} from '@ghostfolio/common/config';
import { DATE_FORMAT, resetHours } from '@ghostfolio/common/helper';
import { UniqueAsset } from '@ghostfolio/common/interfaces';
import { InjectQueue } from '@nestjs/bull';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource } from '@prisma/client';
import { Queue } from 'bull';
import { format, subDays } from 'date-fns';
import ms from 'ms';

import { DataProviderService } from './data-provider/data-provider.service';
import { DataEnhancerInterface } from './data-provider/interfaces/data-enhancer.interface';
import { ExchangeRateDataService } from './exchange-rate-data.service';
import { IDataGatheringItem } from './interfaces/interfaces';
import { PrismaService } from './prisma.service';

@Injectable()
export class DataGatheringService {
  private dataGatheringProgress: number;

  public constructor(
    @Inject('DataEnhancers')
    private readonly dataEnhancers: DataEnhancerInterface[],
    @InjectQueue(DATA_GATHERING_QUEUE)
    private readonly dataGatheringQueue: Queue,
    private readonly dataProviderService: DataProviderService,
    private readonly exchangeRateDataService: ExchangeRateDataService,
    private readonly prismaService: PrismaService,
    private readonly symbolProfileService: SymbolProfileService
  ) {}

  public async gather7Days() {
    const dataGatheringItems = await this.getSymbols7D();
    await this.gatherSymbols(dataGatheringItems);
  }

  public async gatherMax() {
    const dataGatheringItems = await this.getSymbolsMax();
    await this.gatherSymbols(dataGatheringItems);
  }

  public async gatherSymbol({ dataSource, symbol }: UniqueAsset) {
    const symbols = (await this.getSymbolsMax()).filter((dataGatheringItem) => {
      return (
        dataGatheringItem.dataSource === dataSource &&
        dataGatheringItem.symbol === symbol
      );
    });
    await this.gatherSymbols(symbols);
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

    Logger.log(
      `Asset profile data gathering has been started for ${uniqueAssets
        .map(({ dataSource, symbol }) => {
          return `${symbol} (${dataSource})`;
        })
        .join(',')}.`,
      'DataGatheringService'
    );

    const assetProfiles = await this.dataProviderService.getAssetProfiles(
      uniqueAssets
    );
    const symbolProfiles =
      await this.symbolProfileService.getSymbolProfilesBySymbols(
        uniqueAssets.map(({ symbol }) => {
          return symbol;
        })
      );

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
            `Failed to enhance data for symbol ${symbol} by ${dataEnhancer.getName()}`,
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
        name,
        sectors,
        url
      } = assetProfiles[symbol];

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
            symbol,
            url
          },
          update: {
            assetClass,
            assetSubClass,
            countries,
            currency,
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
      }
    }

    Logger.log(
      `Asset profile data gathering has been completed for ${uniqueAssets
        .map(({ dataSource, symbol }) => {
          return `${symbol} (${dataSource})`;
        })
        .join(',')}.`,
      'DataGatheringService'
    );
  }

  public async gatherSymbols(aSymbolsWithStartDate: IDataGatheringItem[]) {
    for (const { dataSource, date, symbol } of aSymbolsWithStartDate) {
      if (dataSource === 'MANUAL') {
        continue;
      }

      await this.dataGatheringQueue.add(
        GATHER_HISTORICAL_MARKET_DATA_PROCESS,
        {
          dataSource,
          date,
          symbol
        },
        {
          attempts: 20,
          backoff: {
            delay: ms('1 minute'),
            type: 'exponential'
          },
          priority: DATA_GATHERING_QUEUE_PRIORITY_LOW
        }
      );
    }
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
        },
        where: {
          dataSource: {
            not: 'MANUAL'
          }
        }
      })
    ).map((symbolProfile) => {
      return {
        ...symbolProfile,
        date: symbolProfile.Order?.[0]?.date ?? startDate
      };
    });

    return [...currencyPairsToGather, ...symbolProfilesToGather];
  }

  public async getUniqueAssets(): Promise<UniqueAsset[]> {
    const symbolProfiles = await this.prismaService.symbolProfile.findMany({
      orderBy: [{ symbol: 'asc' }]
    });

    return symbolProfiles
      .filter(({ dataSource }) => {
        return (
          dataSource !== DataSource.GHOSTFOLIO &&
          dataSource !== DataSource.MANUAL &&
          dataSource !== DataSource.RAKUTEN
        );
      })
      .map(({ dataSource, symbol }) => {
        return {
          dataSource,
          symbol
        };
      });
  }

  private async getSymbols7D(): Promise<IDataGatheringItem[]> {
    const startDate = subDays(resetHours(new Date()), 7);

    const symbolProfiles = await this.prismaService.symbolProfile.findMany({
      orderBy: [{ symbol: 'asc' }],
      select: {
        dataSource: true,
        scraperConfiguration: true,
        symbol: true
      },
      where: {
        dataSource: {
          not: 'MANUAL'
        }
      }
    });

    // Only consider symbols with incomplete market data for the last
    // 7 days
    const symbolsNotToGather = (
      await this.prismaService.marketData.groupBy({
        _count: true,
        by: ['symbol'],
        orderBy: [{ symbol: 'asc' }],
        where: {
          date: { gt: startDate }
        }
      })
    )
      .filter((group) => {
        return group._count >= 6;
      })
      .map((group) => {
        return group.symbol;
      });

    const symbolProfilesToGather = symbolProfiles
      .filter(({ symbol }) => {
        return !symbolsNotToGather.includes(symbol);
      })
      .map((symbolProfile) => {
        return {
          ...symbolProfile,
          date: startDate
        };
      });

    const currencyPairsToGather = this.exchangeRateDataService
      .getCurrencyPairs()
      .filter(({ symbol }) => {
        return !symbolsNotToGather.includes(symbol);
      })
      .map(({ dataSource, symbol }) => {
        return {
          dataSource,
          symbol,
          date: startDate
        };
      });

    return [...currencyPairsToGather, ...symbolProfilesToGather];
  }
}
