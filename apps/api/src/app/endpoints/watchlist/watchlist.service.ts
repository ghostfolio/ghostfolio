import { BenchmarkService } from '@ghostfolio/api/services/benchmark/benchmark.service';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { DataGatheringService } from '@ghostfolio/api/services/queues/data-gathering/data-gathering.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import { WatchlistResponse } from '@ghostfolio/common/interfaces';

import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, Prisma } from '@prisma/client';

@Injectable()
export class WatchlistService {
  public constructor(
    private readonly benchmarkService: BenchmarkService,
    private readonly dataGatheringService: DataGatheringService,
    private readonly dataProviderService: DataProviderService,
    private readonly marketDataService: MarketDataService,
    private readonly prismaService: PrismaService,
    private readonly symbolProfileService: SymbolProfileService
  ) {}

  public async createWatchlistItem({
    dataSource,
    symbol,
    userId
  }: {
    dataSource: DataSource;
    symbol: string;
    userId: string;
  }): Promise<void> {
    const symbolProfile = await this.prismaService.symbolProfile.findUnique({
      where: {
        dataSource_symbol: { dataSource, symbol }
      }
    });

    if (!symbolProfile) {
      const assetProfiles = await this.dataProviderService.getAssetProfiles([
        { dataSource, symbol }
      ]);

      if (!assetProfiles[symbol]?.currency) {
        throw new BadRequestException(
          `Asset profile not found for ${symbol} (${dataSource})`
        );
      }

      await this.symbolProfileService.add(
        assetProfiles[symbol] as Prisma.SymbolProfileCreateInput
      );
    }

    await this.dataGatheringService.gatherSymbol({
      dataSource,
      symbol
    });

    await this.prismaService.user.update({
      data: {
        watchlist: {
          connect: {
            dataSource_symbol: { dataSource, symbol }
          }
        }
      },
      where: { id: userId }
    });
  }

  public async deleteWatchlistItem({
    dataSource,
    symbol,
    userId
  }: {
    dataSource: DataSource;
    symbol: string;
    userId: string;
  }) {
    await this.prismaService.user.update({
      data: {
        watchlist: {
          disconnect: {
            dataSource_symbol: { dataSource, symbol }
          }
        }
      },
      where: { id: userId }
    });
  }

  public async getWatchlistItems(
    userId: string
  ): Promise<WatchlistResponse['watchlist']> {
    const user = await this.prismaService.user.findUnique({
      select: {
        watchlist: {
          select: { dataSource: true, symbol: true }
        }
      },
      where: { id: userId }
    });

    const [assetProfiles, quotes] = await Promise.all([
      this.symbolProfileService.getSymbolProfiles(user.watchlist),
      this.dataProviderService.getQuotes({
        items: user.watchlist.map(({ dataSource, symbol }) => {
          return { dataSource, symbol };
        })
      })
    ]);

    const watchlist = await Promise.all(
      user.watchlist.map(async ({ dataSource, symbol }) => {
        const assetProfile = assetProfiles.find((profile) => {
          return profile.dataSource === dataSource && profile.symbol === symbol;
        });

        const allTimeHigh = await this.marketDataService.getMax({
          dataSource,
          symbol
        });

        const performancePercent =
          this.benchmarkService.calculateChangeInPercentage(
            allTimeHigh?.marketPrice,
            quotes[symbol]?.marketPrice
          );

        return {
          dataSource,
          symbol,
          marketCondition:
            this.benchmarkService.getMarketCondition(performancePercent),
          name: assetProfile?.name,
          performances: {
            allTimeHigh: {
              performancePercent,
              date: allTimeHigh?.date
            }
          }
        };
      })
    );

    return watchlist.sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
  }
}
