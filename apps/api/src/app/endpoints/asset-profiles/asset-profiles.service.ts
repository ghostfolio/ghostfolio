import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import { UpdateAssetProfileDataDto } from '@ghostfolio/common/dtos';
import {
  AssetProfileIdentifier,
  EnhancedSymbolProfile
} from '@ghostfolio/common/interfaces';

import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, Prisma } from '@prisma/client';

@Injectable()
export class AssetProfilesService {
  public constructor(
    private readonly symbolProfileService: SymbolProfileService
  ) {}

  public async updateAssetProfileData(
    { dataSource, symbol }: AssetProfileIdentifier,
    assetProfileData: UpdateAssetProfileDataDto
  ): Promise<EnhancedSymbolProfile> {
    const [assetProfile] = await this.symbolProfileService.getSymbolProfiles([
      {
        dataSource,
        symbol
      }
    ]);

    if (!assetProfile) {
      throw new NotFoundException(
        `Could not find the asset profile for ${symbol} (${dataSource})`
      );
    }

    const data = this.getAssetProfileDataUpdate(assetProfileData);

    if (Object.keys(data).length === 0) {
      return assetProfile;
    }

    await this.symbolProfileService.updateSymbolProfile(
      {
        dataSource,
        symbol
      },
      dataSource === DataSource.MANUAL
        ? data
        : {
            SymbolProfileOverrides: {
              upsert: {
                create: data,
                update: data
              }
            }
          }
    );

    const [updatedAssetProfile] =
      await this.symbolProfileService.getSymbolProfiles([
        {
          dataSource,
          symbol
        }
      ]);

    return updatedAssetProfile;
  }

  private getAssetProfileDataUpdate({
    countries,
    holdings,
    sectors
  }: UpdateAssetProfileDataDto): Pick<
    Prisma.SymbolProfileUpdateInput,
    'countries' | 'holdings' | 'sectors'
  > {
    const data: Pick<
      Prisma.SymbolProfileUpdateInput,
      'countries' | 'holdings' | 'sectors'
    > = {};

    if (countries !== undefined) {
      data.countries = countries as Prisma.JsonArray;
    }

    if (holdings !== undefined) {
      data.holdings = holdings as Prisma.JsonArray;
    }

    if (sectors !== undefined) {
      data.sectors = sectors as Prisma.JsonArray;
    }

    return data;
  }
}
