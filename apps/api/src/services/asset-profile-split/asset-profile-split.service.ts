import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import {
  getAssetProfileIdentifier,
  resetHours
} from '@ghostfolio/common/helper';
import { AssetProfileIdentifier } from '@ghostfolio/common/interfaces';

import { Injectable } from '@nestjs/common';
import { AssetProfileSplit } from '@prisma/client';

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
   * Returns the splits of the given asset profile in ascending order by date
   */
  public async getSplits({
    dataSource,
    symbol
  }: AssetProfileIdentifier): Promise<AssetProfileSplit[]> {
    return this.prismaService.assetProfileSplit.findMany({
      orderBy: [
        {
          date: 'asc'
        }
      ],
      where: {
        symbolProfile: {
          dataSource,
          symbol
        }
      }
    });
  }

  /**
   * Returns the splits of all given asset profiles, grouped by their
   * data-source/symbol identifier.
   */
  public async getSplitsByAssetProfiles(
    assetProfiles: AssetProfileIdentifier[]
  ): Promise<Map<string, AssetProfileSplit[]>> {
    const splitsByAssetProfile = new Map<string, AssetProfileSplit[]>();

    for (const assetProfile of assetProfiles) {
      splitsByAssetProfile.set(getAssetProfileIdentifier(assetProfile), []);
    }

    if (assetProfiles.length === 0) {
      return splitsByAssetProfile;
    }

    const splits = await this.prismaService.assetProfileSplit.findMany({
      include: {
        symbolProfile: {
          select: {
            dataSource: true,
            symbol: true
          }
        }
      },
      orderBy: [{ date: 'asc' }],
      where: {
        symbolProfile: {
          OR: assetProfiles
        }
      }
    });

    for (const { symbolProfile, ...split } of splits) {
      splitsByAssetProfile
        .get(getAssetProfileIdentifier(symbolProfile))
        ?.push(split);
    }

    return splitsByAssetProfile;
  }

  public async upsert({
    date,
    denominator,
    numerator,
    symbolProfileId
  }: {
    date: Date;
    denominator: number;
    numerator: number;
    symbolProfileId: string;
  }): Promise<AssetProfileSplit> {
    const dateOfSplit = resetHours(date);

    return this.prismaService.assetProfileSplit.upsert({
      create: {
        denominator,
        numerator,
        symbolProfileId,
        date: dateOfSplit
      },
      update: {
        denominator,
        numerator
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
