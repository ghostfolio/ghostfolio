import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';

import { Injectable } from '@nestjs/common';
import { AssetProfileSplit } from '@prisma/client';

@Injectable()
export class AssetProfileSplitService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async deleteById({
    dataSource,
    id,
    symbol
  }: AssetProfileIdentifier & { id: string }) {
    return this.prismaService.assetProfileSplit.deleteMany({
      where: {
        dataSource,
        id,
        symbol
      }
    });
  }

  public async deleteMany({ dataSource, symbol }: AssetProfileIdentifier) {
    return this.prismaService.assetProfileSplit.deleteMany({
      where: {
        dataSource,
        symbol
      }
    });
  }

  public async getSplits({
    assetProfileIdentifiers
  }: {
    assetProfileIdentifiers: AssetProfileIdentifier[];
  }): Promise<AssetProfileSplit[]> {
    if (assetProfileIdentifiers.length === 0) {
      return [];
    }

    return this.prismaService.assetProfileSplit.findMany({
      orderBy: [
        {
          date: 'asc'
        }
      ],
      where: {
        OR: assetProfileIdentifiers.map(({ dataSource, symbol }) => {
          return {
            dataSource,
            symbol
          };
        })
      }
    });
  }

  public async upsert({
    dataSource,
    date,
    factor,
    symbol
  }: AssetProfileIdentifier & {
    date: Date;
    factor: number;
  }): Promise<AssetProfileSplit> {
    return this.prismaService.assetProfileSplit.upsert({
      create: {
        dataSource,
        date,
        factor,
        symbol
      },
      update: {
        factor
      },
      where: {
        dataSource_date_symbol: {
          dataSource,
          date,
          symbol
        }
      }
    });
  }

  public async updateAssetProfileIdentifier(
    oldAssetProfileIdentifier: AssetProfileIdentifier,
    newAssetProfileIdentifier: AssetProfileIdentifier
  ) {
    return this.prismaService.assetProfileSplit.updateMany({
      data: {
        dataSource: newAssetProfileIdentifier.dataSource,
        symbol: newAssetProfileIdentifier.symbol
      },
      where: {
        dataSource: oldAssetProfileIdentifier.dataSource,
        symbol: oldAssetProfileIdentifier.symbol
      }
    });
  }
}
