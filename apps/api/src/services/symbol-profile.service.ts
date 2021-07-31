import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { Injectable } from '@nestjs/common';
import { Prisma, SymbolProfile } from '@prisma/client';
import { continents, countries } from 'countries-list';
import { UNKNOWN_KEY } from '@ghostfolio/common/config';
import { Country } from '@ghostfolio/common/interfaces/country.interface';
import { EnhancedSymbolProfile } from '@ghostfolio/api/services/interfaces/symbol-profile.interface';
import { Sector } from '@ghostfolio/common/interfaces/sector.interface';

@Injectable()
export class SymbolProfileService {
  constructor(private prisma: PrismaService) {}

  public async getSymbolProfiles(
    symbols: string[]
  ): Promise<EnhancedSymbolProfile[]> {
    return this.prisma.symbolProfile
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
      sectors: this.getSectors(symbolProfile)
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
}
