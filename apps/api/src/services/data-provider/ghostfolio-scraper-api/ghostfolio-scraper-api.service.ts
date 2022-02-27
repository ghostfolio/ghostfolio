import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { DataProviderInterface } from '@ghostfolio/api/services/data-provider/interfaces/data-provider.interface';
import {
  IDataProviderHistoricalResponse,
  IDataProviderResponse,
  MarketState
} from '@ghostfolio/api/services/interfaces/interfaces';
import { PrismaService } from '@ghostfolio/api/services/prisma.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile.service';
import {
  DATE_FORMAT,
  getYesterday,
  isGhostfolioScraperApiSymbol
} from '@ghostfolio/common/helper';
import { Granularity } from '@ghostfolio/common/types';
import { Injectable, Logger } from '@nestjs/common';
import { DataSource, SymbolProfile } from '@prisma/client';
import * as bent from 'bent';
import * as cheerio from 'cheerio';
import { format } from 'date-fns';

@Injectable()
export class GhostfolioScraperApiService implements DataProviderInterface {
  private static NUMERIC_REGEXP = /[-]{0,1}[\d]*[.,]{0,1}[\d]+/g;

  public constructor(
    private readonly prismaService: PrismaService,
    private readonly symbolProfileService: SymbolProfileService
  ) {}

  public canHandle(symbol: string) {
    return isGhostfolioScraperApiSymbol(symbol);
  }

  public async getAssetProfile(
    aSymbol: string
  ): Promise<Partial<SymbolProfile>> {
    return {
      dataSource: this.getName()
    };
  }

  public async getHistorical(
    aSymbol: string,
    aGranularity: Granularity = 'day',
    from: Date,
    to: Date
  ): Promise<{
    [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
  }> {
    try {
      const symbol = aSymbol;

      const [symbolProfile] = await this.symbolProfileService.getSymbolProfiles(
        [symbol]
      );
      const scraperConfiguration = symbolProfile?.scraperConfiguration;

      const get = bent(scraperConfiguration?.url, 'GET', 'string', 200, {});

      const html = await get();
      const $ = cheerio.load(html);

      const value = this.extractNumberFromString(
        $(scraperConfiguration?.selector).text()
      );

      return {
        [symbol]: {
          [format(getYesterday(), DATE_FORMAT)]: {
            marketPrice: value
          }
        }
      };
    } catch (error) {
      Logger.error(error);
    }

    return {};
  }

  public getName(): DataSource {
    return DataSource.GHOSTFOLIO;
  }

  public async getQuotes(
    aSymbols: string[]
  ): Promise<{ [symbol: string]: IDataProviderResponse }> {
    if (aSymbols.length <= 0) {
      return {};
    }

    try {
      const [symbol] = aSymbols;
      const [symbolProfile] = await this.symbolProfileService.getSymbolProfiles(
        [symbol]
      );

      const { marketPrice } = await this.prismaService.marketData.findFirst({
        orderBy: {
          date: 'desc'
        },
        where: {
          symbol
        }
      });

      return {
        [symbol]: {
          marketPrice,
          currency: symbolProfile?.currency,
          dataSource: this.getName(),
          marketState: MarketState.delayed
        }
      };
    } catch (error) {
      Logger.error(error);
    }

    return {};
  }

  public async search(aQuery: string): Promise<{ items: LookupItem[] }> {
    const items = await this.prismaService.symbolProfile.findMany({
      select: {
        currency: true,
        dataSource: true,
        name: true,
        symbol: true
      },
      where: {
        OR: [
          {
            dataSource: this.getName(),
            name: {
              mode: 'insensitive',
              startsWith: aQuery
            }
          },
          {
            dataSource: this.getName(),
            symbol: {
              mode: 'insensitive',
              startsWith: aQuery
            }
          }
        ]
      }
    });

    return { items };
  }

  private extractNumberFromString(aString: string): number {
    try {
      const [numberString] = aString.match(
        GhostfolioScraperApiService.NUMERIC_REGEXP
      );
      return parseFloat(numberString.trim());
    } catch {
      return undefined;
    }
  }
}
