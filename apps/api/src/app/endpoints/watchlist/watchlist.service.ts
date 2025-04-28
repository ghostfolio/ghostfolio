import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';

import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from '@prisma/client';

@Injectable()
export class WatchlistService {
  public constructor(private readonly prismaService: PrismaService) {}

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
      throw new NotFoundException(
        `Asset profile not found for ${symbol} (${dataSource})`
      );
    }

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
  ): Promise<AssetProfileIdentifier[]> {
    const user = await this.prismaService.user.findUnique({
      select: {
        watchlist: {
          select: { dataSource: true, symbol: true }
        }
      },
      where: { id: userId }
    });

    return user?.watchlist ?? [];
  }
}
