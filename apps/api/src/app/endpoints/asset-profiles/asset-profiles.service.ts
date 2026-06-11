import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import { UpdateAssetProfileDataDto } from '@ghostfolio/common/dtos';
import {
  AssetProfileIdentifier,
  EnhancedSymbolProfile
} from '@ghostfolio/common/interfaces';

import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Injectable()
export class AssetProfilesService {
  public constructor(
    private readonly symbolProfileService: SymbolProfileService
  ) {}

  public async updateAssetProfileData(
    { dataSource, symbol }: AssetProfileIdentifier,
    assetProfileData: UpdateAssetProfileDataDto
  ): Promise<EnhancedSymbolProfile> {
    const notFoundMessage = `Could not find the asset profile for ${symbol} (${dataSource})`;

    const data = this.getAssetProfileDataUpdate(assetProfileData);

    if (Object.keys(data).length > 0) {
      try {
        await this.symbolProfileService.updateSymbolProfile(
          {
            dataSource,
            symbol
          },
          this.symbolProfileService.getAssetProfileUpdateInput(
            { dataSource, symbol },
            data
          )
        );
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2025'
        ) {
          throw new NotFoundException(notFoundMessage);
        }

        throw error;
      }
    }

    const [assetProfile] = await this.symbolProfileService.getSymbolProfiles([
      {
        dataSource,
        symbol
      }
    ]);

    if (!assetProfile) {
      throw new NotFoundException(notFoundMessage);
    }

    return assetProfile;
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
