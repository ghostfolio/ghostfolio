import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';

import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from '@prisma/client';

@Injectable()
export class WatchlistService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async getWatchlistItems(
    userId: string
  ): Promise<AssetProfileIdentifier[]> {
    const user = await this.prismaService.user.findUnique({
      where: {
        id: userId
      },
      select: {
        watchlist: {
          select: {
            dataSource: true,
            symbol: true
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundException(
        `User watchlist with ID ${userId} not found.`
      );
    }

    return user.watchlist ?? [];
  }

  public async createWatchlistItem({
    userId,
    dataSource,
    symbol
  }: {
    userId: string;
    dataSource: DataSource;
    symbol: string;
  }): Promise<void> {
    const symbolProfile = await this.prismaService.symbolProfile.findUnique({
      where: { dataSource_symbol: { dataSource, symbol } }
    });
    if (!symbolProfile) {
      throw new NotFoundException(`Symbol ${symbol} not found.`);
    }
    await this.prismaService.user.update({
      where: { id: userId },
      data: {
        watchlist: {
          connect: {
            dataSource_symbol: {
              dataSource,
              symbol
            }
          }
        }
      }
    });
  }

  public async deleteWatchlistItem({
    userId,
    dataSource,
    symbol
  }: {
    userId: string;
    dataSource: DataSource;
    symbol: string;
  }) {
    await this.prismaService.user.update({
      where: { id: userId },
      data: {
        watchlist: {
          disconnect: {
            dataSource_symbol: {
              dataSource,
              symbol
            }
          }
        }
      }
    });
  }
}
