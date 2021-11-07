import { EnhancedSymbolProfile } from '@ghostfolio/api/services/interfaces/symbol-profile.interface';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { UNKNOWN_KEY } from '@ghostfolio/common/config';
import { Country } from '@ghostfolio/common/interfaces/country.interface';
import { Sector } from '@ghostfolio/common/interfaces/sector.interface';
import { Injectable } from '@nestjs/common';
import { Prisma, SymbolProfile } from '@prisma/client';
import { continents, countries } from 'countries-list';

import { ScraperConfiguration } from './data-provider/ghostfolio-scraper-api/interfaces/scraper-configuration.interface';

@Injectable()
export class SymbolProfileService {
  constructor(private readonly prismaService: PrismaService) {}

  public async getSymbolProfiles(
    symbols: string[]
  ): Promise<EnhancedSymbolProfile[]> {
    return this.prismaService.symbolProfile
      .findMany({
        where: {
          symbol: {
            in: symbols
          }
        }
      })
      .then((symbolProfiles) => this.getSymbols(symbolProfiles));
  }

  private getSymbols(symbolProfiles: SymbolProfile[]): EnhancedSymbolProfile[] {
    return symbolProfiles.map((symbolProfile) => ({
      ...symbolProfile,
      countries: this.getCountries(symbolProfile),
      scraperConfiguration: this.getScraperConfiguration(symbolProfile),
      sectors: this.getSectors(symbolProfile),
      symbolMapping: this.getSymbolMapping(symbolProfile)
    }));
  }

  private getCountries(symbolProfile: SymbolProfile): Country[] {
    return ((symbolProfile?.countries as Prisma.JsonArray) ?? []).map(
      (country) => {
        const { code, weight } = country as Prisma.JsonObject;

        return {
          code: code as string,
          continent:
            continents[countries[code as string]?.continent] ?? UNKNOWN_KEY,
          name: countries[code as string]?.name ?? UNKNOWN_KEY,
          weight: weight as number
        };
      }
    );
  }

  private getScraperConfiguration(
    symbolProfile: SymbolProfile
  ): ScraperConfiguration {
    const scraperConfiguration =
      symbolProfile.scraperConfiguration as Prisma.JsonObject;

    return {
      selector: scraperConfiguration.selector as string,
      url: scraperConfiguration.url as string
    };
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
