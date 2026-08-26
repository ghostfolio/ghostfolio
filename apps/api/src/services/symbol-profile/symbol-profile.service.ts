import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { UNKNOWN_KEY } from '@ghostfolio/common/config';
import { applyAssetProfileOverrides } from '@ghostfolio/common/helper';
import {
  AssetProfileIdentifier,
  EnhancedAssetProfile,
  Holding,
  ScraperConfiguration
} from '@ghostfolio/common/interfaces';
import { Country } from '@ghostfolio/common/interfaces/country.interface';
import { Sector } from '@ghostfolio/common/interfaces/sector.interface';

import { Injectable } from '@nestjs/common';
import {
  AssetProfileOverrides,
  DataSource,
  Prisma,
  SymbolProfile
} from '@prisma/client';
import { continents, countries } from 'countries-list';

@Injectable()
export class SymbolProfileService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async add(
    assetProfile: Prisma.SymbolProfileCreateInput
  ): Promise<SymbolProfile | never> {
    return this.prismaService.symbolProfile.create({ data: assetProfile });
  }

  public async delete({ dataSource, symbol }: AssetProfileIdentifier) {
    return this.prismaService.symbolProfile.delete({
      where: { dataSource_symbol: { dataSource, symbol } }
    });
  }

  public deleteAssetProfileOverrides({
    dataSource,
    symbol
  }: AssetProfileIdentifier) {
    return this.prismaService.assetProfileOverrides.deleteMany({
      where: { symbolProfile: { dataSource, symbol } }
    });
  }

  public async deleteById(id: string) {
    return this.prismaService.symbolProfile.delete({
      where: { id }
    });
  }

  public async getActiveSymbolProfilesByUserSubscription({
    withUserSubscription = false
  }: {
    withUserSubscription?: boolean;
  }) {
    return this.prismaService.symbolProfile.findMany({
      include: {
        activities: {
          include: {
            user: true
          }
        }
      },
      orderBy: [{ symbol: 'asc' }],
      where: {
        activities: withUserSubscription
          ? {
              some: {
                user: {
                  subscriptions: { some: { expiresAt: { gt: new Date() } } }
                }
              }
            }
          : {
              every: {
                user: {
                  subscriptions: { none: { expiresAt: { gt: new Date() } } }
                }
              }
            },
        isActive: true
      }
    });
  }

  public getAssetProfileUpdateInput(
    { dataSource }: AssetProfileIdentifier,
    data: Prisma.SymbolProfileUpdateInput
  ): Prisma.SymbolProfileUpdateInput {
    if (dataSource === DataSource.MANUAL) {
      return data;
    }

    return {
      assetProfileOverrides: {
        upsert: {
          create:
            data as Prisma.AssetProfileOverridesCreateWithoutSymbolProfileInput,
          update:
            data as Prisma.AssetProfileOverridesUpdateWithoutSymbolProfileInput
        }
      }
    };
  }

  public async getCustomSymbolProfilesByNames({
    names,
    userId
  }: {
    names: string[];
    userId: string;
  }): Promise<Pick<SymbolProfile, 'name' | 'symbol'>[]> {
    if (names.length === 0) {
      return [];
    }

    return this.prismaService.symbolProfile.findMany({
      select: { name: true, symbol: true },
      where: {
        userId,
        dataSource: DataSource.MANUAL,
        name: { in: names }
      }
    });
  }

  /**
   * Gets the symbol to use for an asset profile. An asset profile which is
   * already in the database wins, also if its symbol has a different letter
   * case. This prevents a second asset profile for the same instrument.
   * Otherwise the symbol of the data provider is used, because it has the
   * correct letter case. A custom asset profile (MANUAL) belongs to a user,
   * thus its symbol stays unchanged.
   */
  public async getSymbolOfAssetProfile({
    dataSource,
    symbol,
    symbolOfDataProvider
  }: { symbolOfDataProvider?: string } & AssetProfileIdentifier) {
    if (dataSource === DataSource.MANUAL) {
      return symbol;
    }

    const symbolProfile = await this.prismaService.symbolProfile.findFirst({
      where: {
        dataSource,
        symbol: { equals: symbol, mode: 'insensitive' }
      }
    });

    return symbolProfile?.symbol ?? symbolOfDataProvider ?? symbol;
  }

  public async getSymbolProfiles(
    aAssetProfileIdentifiers: AssetProfileIdentifier[]
  ): Promise<EnhancedAssetProfile[]> {
    return this.prismaService.symbolProfile
      .findMany({
        include: {
          _count: {
            select: { activities: true, watchedBy: true }
          },
          activities: {
            orderBy: {
              date: 'asc'
            },
            select: { date: true },
            take: 1
          },
          assetProfileOverrides: true
        },
        where: {
          OR: aAssetProfileIdentifiers.map(({ dataSource, symbol }) => {
            return {
              dataSource,
              symbol
            };
          })
        }
      })
      .then((symbolProfiles) => {
        return this.enhanceSymbolProfiles(symbolProfiles);
      });
  }

  public async getSymbolProfilesByIds(
    symbolProfileIds: string[]
  ): Promise<EnhancedAssetProfile[]> {
    return this.prismaService.symbolProfile
      .findMany({
        include: {
          _count: {
            select: { activities: true, watchedBy: true }
          },
          assetProfileOverrides: true
        },
        where: {
          id: {
            in: symbolProfileIds.map((symbolProfileId) => {
              return symbolProfileId;
            })
          }
        }
      })
      .then((symbolProfiles) => {
        return this.enhanceSymbolProfiles(symbolProfiles);
      });
  }

  public updateAssetProfileIdentifier(
    oldAssetProfileIdentifier: AssetProfileIdentifier,
    newAssetProfileIdentifier: AssetProfileIdentifier
  ) {
    return this.prismaService.symbolProfile.update({
      data: {
        dataSource: newAssetProfileIdentifier.dataSource,
        symbol: newAssetProfileIdentifier.symbol
      },
      where: {
        dataSource_symbol: {
          dataSource: oldAssetProfileIdentifier.dataSource,
          symbol: oldAssetProfileIdentifier.symbol
        }
      }
    });
  }

  public updateSymbolProfile(
    { dataSource, symbol }: AssetProfileIdentifier,
    {
      assetClass,
      assetProfileOverrides,
      assetSubClass,
      comment,
      countries,
      currency,
      dataGatheringFrequency,
      holdings,
      isActive,
      name,
      scraperConfiguration,
      sectors,
      symbolMapping,
      url
    }: Prisma.SymbolProfileUpdateInput
  ) {
    return this.prismaService.symbolProfile.update({
      data: {
        assetClass,
        assetProfileOverrides,
        assetSubClass,
        comment,
        countries,
        currency,
        dataGatheringFrequency,
        holdings,
        isActive,
        name,
        scraperConfiguration,
        sectors,
        symbolMapping,
        url
      },
      where: { dataSource_symbol: { dataSource, symbol } }
    });
  }

  private enhanceSymbolProfiles(
    symbolProfiles: (SymbolProfile & {
      _count: { activities: number; watchedBy?: number };
      activities?: {
        date: Date;
      }[];
      assetProfileOverrides: AssetProfileOverrides;
    })[]
  ): EnhancedAssetProfile[] {
    return symbolProfiles.map((symbolProfile) => {
      const symbolProfileWithOverrides = applyAssetProfileOverrides(
        symbolProfile,
        symbolProfile.assetProfileOverrides
      );

      const item = {
        ...symbolProfileWithOverrides,
        activitiesCount: 0,
        countries: this.getCountries(
          symbolProfileWithOverrides?.countries as unknown as Prisma.JsonArray
        ),
        dateOfFirstActivity: undefined as Date,
        holdings: this.getHoldings(
          symbolProfileWithOverrides?.holdings as unknown as Prisma.JsonArray
        ),
        scraperConfiguration: this.getScraperConfiguration(
          symbolProfileWithOverrides
        ),
        sectors: this.getSectors(
          symbolProfileWithOverrides?.sectors as unknown as Prisma.JsonArray
        ),
        symbolMapping: this.getSymbolMapping(symbolProfileWithOverrides),
        watchedByCount: 0
      };

      item.activitiesCount = symbolProfile._count.activities;
      item.watchedByCount = symbolProfile._count.watchedBy ?? 0;
      delete item._count;

      item.dateOfFirstActivity = symbolProfile.activities?.[0]?.date;
      delete item.activities;

      delete item.assetProfileOverrides;

      return item;
    });
  }

  private getCountries(aCountries: Prisma.JsonArray = []): Country[] {
    if (aCountries === null) {
      return [];
    }

    return aCountries.map((country: Pick<Country, 'code' | 'weight'>) => {
      const { code, weight } = country;

      return {
        code,
        weight,
        continent: continents[countries[code]?.continent] ?? UNKNOWN_KEY,
        name: countries[code]?.name ?? UNKNOWN_KEY
      };
    });
  }

  private getHoldings(aHoldings: Prisma.JsonArray = []): Holding[] {
    if (aHoldings === null) {
      return [];
    }

    return aHoldings.map((holding) => {
      const { name, weight } = holding as Prisma.JsonObject;

      return {
        allocationInPercentage: weight as number,
        name: (name as string) ?? UNKNOWN_KEY,
        valueInBaseCurrency: undefined
      };
    });
  }

  private getScraperConfiguration(
    symbolProfile: SymbolProfile
  ): ScraperConfiguration {
    const scraperConfiguration =
      symbolProfile.scraperConfiguration as Prisma.JsonObject;

    if (scraperConfiguration) {
      return {
        defaultMarketPrice: scraperConfiguration.defaultMarketPrice as number,
        headers:
          scraperConfiguration.headers as ScraperConfiguration['headers'],
        locale: scraperConfiguration.locale as string,
        mode:
          (scraperConfiguration.mode as ScraperConfiguration['mode']) ?? 'lazy',
        selector: scraperConfiguration.selector as string,
        url: scraperConfiguration.url as string
      };
    }

    return null;
  }

  private getSectors(aSectors: Prisma.JsonArray = []): Sector[] {
    if (aSectors === null) {
      return [];
    }

    return aSectors.map((sector) => {
      const { name, weight } = sector as Prisma.JsonObject;

      return {
        name: (name as string) ?? UNKNOWN_KEY,
        weight: weight as number
      };
    });
  }

  private getSymbolMapping(symbolProfile: SymbolProfile) {
    return (
      (symbolProfile['symbolMapping'] as {
        [key: string]: string;
      }) ?? {}
    );
  }
}
