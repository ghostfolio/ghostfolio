import { LogPerformance } from '@ghostfolio/api/interceptors/performance-logging/performance-logging.interceptor';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { UNKNOWN_KEY } from '@ghostfolio/common/config';
import {
  AssetProfileIdentifier,
  EnhancedSymbolProfile,
  Holding,
  ScraperConfiguration
} from '@ghostfolio/common/interfaces';
import { Country } from '@ghostfolio/common/interfaces/country.interface';
import { Sector } from '@ghostfolio/common/interfaces/sector.interface';

import { Injectable } from '@nestjs/common';
import {
  Prisma,
  SymbolProfile,
  SymbolProfileOverrides,
  Tag
} from '@prisma/client';
import { continents, countries } from 'countries-list';

@Injectable()
export class SymbolProfileService {
  public constructor(private readonly prismaService: PrismaService) {}

  @LogPerformance
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

  @LogPerformance
  public async getSymbolProfiles(
    aAssetProfileIdentifiers: AssetProfileIdentifier[]
  ): Promise<EnhancedSymbolProfile[]> {
    return this.prismaService.symbolProfile
      .findMany({
        include: {
          _count: {
            select: { activities: true }
          },
          activities: {
            orderBy: {
              date: 'asc'
            },
            select: { date: true },
            take: 1
          },
          tags: true,
          SymbolProfileOverrides: true
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

  public async deleteById(id: string) {
    return this.prismaService.symbolProfile.delete({
      where: { id }
    });
  }

  public async getSymbolProfilesByIds(
    symbolProfileIds: string[]
  ): Promise<EnhancedSymbolProfile[]> {
    return this.prismaService.symbolProfile
      .findMany({
        include: {
          _count: {
            select: { activities: true }
          },
          SymbolProfileOverrides: true,
          tags: true
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
      assetSubClass,
      comment,
      countries,
      currency,
      holdings,
      isActive,
      name,
      tags,
      scraperConfiguration,
      sectors,
      symbolMapping,
      SymbolProfileOverrides,
      url
    }: Prisma.SymbolProfileUpdateInput
  ) {
    return this.prismaService.symbolProfile.update({
      data: {
        assetClass,
        assetSubClass,
        comment,
        countries,
        currency,
        holdings,
        isActive,
        name,
        tags,
        scraperConfiguration,
        sectors,
        symbolMapping,
        SymbolProfileOverrides,
        url
      },
      where: { dataSource_symbol: { dataSource, symbol } }
    });
  }

  private enhanceSymbolProfiles(
    symbolProfiles: (SymbolProfile & {
      _count: { activities: number };
      activities?: {
        date: Date;
      }[];
      tags?: Tag[];
      SymbolProfileOverrides: SymbolProfileOverrides;
    })[]
  ): EnhancedSymbolProfile[] {
    return symbolProfiles.map((symbolProfile) => {
      const item = {
        ...symbolProfile,
        activitiesCount: 0,
        countries: this.getCountries(
          symbolProfile?.countries as unknown as Prisma.JsonArray
        ),
        dateOfFirstActivity: undefined as Date,
        holdings: this.getHoldings(
          symbolProfile?.holdings as unknown as Prisma.JsonArray
        ),
        scraperConfiguration: this.getScraperConfiguration(symbolProfile),
        sectors: this.getSectors(
          symbolProfile?.sectors as unknown as Prisma.JsonArray
        ),
        symbolMapping: this.getSymbolMapping(symbolProfile),
        tags: symbolProfile?.tags
      };

      item.activitiesCount = symbolProfile._count.activities;
      delete item._count;

      item.dateOfFirstActivity = symbolProfile.activities?.[0]?.date;
      delete item.activities;

      if (item.SymbolProfileOverrides) {
        item.assetClass =
          item.SymbolProfileOverrides.assetClass ?? item.assetClass;
        item.assetSubClass =
          item.SymbolProfileOverrides.assetSubClass ?? item.assetSubClass;

        if (
          (item.SymbolProfileOverrides.countries as unknown as Prisma.JsonArray)
            ?.length > 0
        ) {
          item.countries = this.getCountries(
            item.SymbolProfileOverrides.countries as unknown as Prisma.JsonArray
          );
        }

        if (
          (item.SymbolProfileOverrides.holdings as unknown as Holding[])
            ?.length > 0
        ) {
          item.holdings = this.getHoldings(
            item.SymbolProfileOverrides.holdings as unknown as Prisma.JsonArray
          );
        }

        item.name = item.SymbolProfileOverrides.name ?? item.name;

        if (
          (item.SymbolProfileOverrides.sectors as unknown as Sector[])?.length >
          0
        ) {
          item.sectors = this.getSectors(
            item.SymbolProfileOverrides.sectors as unknown as Prisma.JsonArray
          );
        }

        item.url = item.SymbolProfileOverrides.url ?? item.url;

        delete item.SymbolProfileOverrides;
      }

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
