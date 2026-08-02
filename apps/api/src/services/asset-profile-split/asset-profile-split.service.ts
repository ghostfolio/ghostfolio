import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { resetHours } from '@ghostfolio/common/helper';
import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';

import { Injectable } from '@nestjs/common';
import { AssetProfileSplit } from '@prisma/client';

export type AssetProfileSplitWithAssetProfileIdentifier = AssetProfileSplit & {
  symbolProfile: AssetProfileIdentifier;
};

@Injectable()
export class AssetProfileSplitService {
  public constructor(private readonly prismaService: PrismaService) {}

  /**
   * Deletes the split with the given id of an asset profile and returns
   * whether it existed
   */
  public async deleteById({
    id,
    symbolProfileId
  }: {
    id: string;
    symbolProfileId: string;
  }) {
    const { count } = await this.prismaService.assetProfileSplit.deleteMany({
      where: {
        id,
        symbolProfileId
      }
    });

    return count > 0;
  }

  /**
   * Returns the splits of the given asset profiles in ascending order by date.
   * Each split carries the identifier of its asset profile so that the result
   * can be grouped when querying multiple asset profiles at once.
   */
  public async getSplits({
    assetProfileIdentifiers
  }: {
    assetProfileIdentifiers: AssetProfileIdentifier[];
  }): Promise<AssetProfileSplitWithAssetProfileIdentifier[]> {
    if (assetProfileIdentifiers.length === 0) {
      return [];
    }

    return this.prismaService.assetProfileSplit.findMany({
      include: {
        symbolProfile: {
          select: {
            dataSource: true,
            symbol: true
          }
        }
      },
      orderBy: [
        {
          date: 'asc'
        }
      ],
      where: {
        symbolProfile: {
          OR: assetProfileIdentifiers.map(({ dataSource, symbol }) => {
            return {
              dataSource,
              symbol
            };
          })
        }
      }
    });
  }

  public async upsert({
    date,
    factor,
    symbolProfileId
  }: {
    date: Date;
    factor: number;
    symbolProfileId: string;
  }): Promise<AssetProfileSplit> {
    const dateOfSplit = resetHours(date);

    return this.prismaService.assetProfileSplit.upsert({
      create: {
        factor,
        symbolProfileId,
        date: dateOfSplit
      },
      update: {
        factor
      },
      where: {
        symbolProfileId_date: {
          symbolProfileId,
          date: dateOfSplit
        }
      }
    });
  }
}
