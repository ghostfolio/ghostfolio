import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { UNKNOWN_KEY } from '@ghostfolio/common/config';
import {
  EnhancedSymbolProfile,
  Holding,
  ScraperConfiguration,
  UniqueAsset
} from '@ghostfolio/common/interfaces';
import { Country } from '@ghostfolio/common/interfaces/country.interface';
import { Sector } from '@ghostfolio/common/interfaces/sector.interface';

import { Injectable } from '@nestjs/common';
import { Prisma, SymbolProfile, SymbolProfileOverrides } from '@prisma/client';
import { continents, countries } from 'countries-list';

@Injectable()
export class SymbolProfileService {
  public constructor(private readonly prismaService: PrismaService) {}

  public async add(
    assetProfile: Prisma.SymbolProfileCreateInput
  ): Promise<SymbolProfile | never> {
    return this.prismaService.symbolProfile.create({ data: assetProfile });
  }

  public async delete({ dataSource, symbol }: UniqueAsset) {
    return this.prismaService.symbolProfile.delete({
      where: { dataSource_symbol: { dataSource, symbol } }
    });
  }

  public async deleteById(id: string) {
    return this.prismaService.symbolProfile.delete({
      where: { id }
    });
  }

  public async getSymbolProfiles(
    aUniqueAssets: UniqueAsset[]
  ): Promise<EnhancedSymbolProfile[]> {
    return this.prismaService.symbolProfile
      .findMany({
        include: {
          _count: {
            select: { Order: true }
          },
          Order: {
            orderBy: {
              date: 'asc'
            },
            select: { date: true },
            take: 1
          },
          SymbolProfileOverrides: true
        },
        where: {
          OR: aUniqueAssets.map(({ dataSource, symbol }) => {
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
  ): Promise<EnhancedSymbolProfile[]> {
    return this.prismaService.symbolProfile
      .findMany({
        include: {
          _count: {
            select: { Order: true }
          },
          SymbolProfileOverrides: true
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

  public updateSymbolProfile({
    assetClass,
    assetSubClass,
    comment,
    countries,
    currency,
    dataSource,
    holdings,
    name,
    scraperConfiguration,
    sectors,
    symbol,
    symbolMapping,
    SymbolProfileOverrides,
    url
  }: Prisma.SymbolProfileUpdateInput & UniqueAsset) {
    return this.prismaService.symbolProfile.update({
      data: {
        assetClass,
        assetSubClass,
        comment,
        countries,
        currency,
        holdings,
        name,
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
      _count: { Order: number };
      Order?: {
        date: Date;
      }[];
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
        dateOfFirstActivity: <Date>undefined,
        holdings: this.getHoldings(symbolProfile),
        scraperConfiguration: this.getScraperConfiguration(symbolProfile),
        sectors: this.getSectors(symbolProfile),
        symbolMapping: this.getSymbolMapping(symbolProfile)
      };

      item.activitiesCount = symbolProfile._count.Order;
      delete item._count;

      item.dateOfFirstActivity = symbolProfile.Order?.[0]?.date;
      delete item.Order;

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
            item.SymbolProfileOverrides
              ?.countries as unknown as Prisma.JsonArray
          );
        }

        if (
          (item.SymbolProfileOverrides.holdings as unknown as Holding[])
            ?.length > 0
        ) {
          item.holdings = item.SymbolProfileOverrides
            .holdings as unknown as Holding[];
        }

        item.name = item.SymbolProfileOverrides?.name ?? item.name;

        if (
          (item.SymbolProfileOverrides.sectors as unknown as Sector[])?.length >
          0
        ) {
          item.sectors = item.SymbolProfileOverrides
            .sectors as unknown as Sector[];
        }

        item.url = item.SymbolProfileOverrides?.url ?? item.url;

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

  private getHoldings(symbolProfile: SymbolProfile): Holding[] {
    return ((symbolProfile?.holdings as Prisma.JsonArray) ?? []).map(
      (holding) => {
        const { name, weight } = holding as Prisma.JsonObject;

        return {
          name: (name as string) ?? UNKNOWN_KEY,
          valueInBaseCurrency: weight as number
        };
      }
    );
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
        postprocessor: scraperConfiguration.postprocessor as string,
        selector: scraperConfiguration.selector as string,
        url: scraperConfiguration.url as string
      };
    }

    return null;
  }

  private getSectors(symbolProfile: SymbolProfile): Sector[] {
    return ((symbolProfile?.sectors as Prisma.JsonArray) ?? []).map(
      (sector) => {
        const { name, weight } = sector as Prisma.JsonObject;

        return {
          name: (name as string) ?? UNKNOWN_KEY,
          weight: weight as number
        };
      }
    );
  }

  private getSymbolMapping(symbolProfile: SymbolProfile) {
    return (
      (symbolProfile['symbolMapping'] as {
        [key: string]: string;
      }) ?? {}
    );
  }
}
