import { getYesterday } from '@ghostfolio/helper';
import { Injectable } from '@nestjs/common';
import * as bent from 'bent';
import * as cheerio from 'cheerio';
import { format } from 'date-fns';

import { DataProviderInterface } from '../../interfaces/data-provider.interface';
import { Granularity } from '../../interfaces/granularity.type';
import {
  IDataProviderHistoricalResponse,
  IDataProviderResponse,
  MarketState
} from '../../interfaces/interfaces';
import { PrismaService } from '../../prisma.service';
import { ScraperConfig } from './interfaces/scraper-config.interface';

@Injectable()
export class GhostfolioScraperApiService implements DataProviderInterface {
  private static NUMERIC_REGEXP = /[-]{0,1}[\d]*[.,]{0,1}[\d]+/g;

  public constructor(private prisma: PrismaService) {}

  public async get(
    aSymbols: string[]
  ): Promise<{ [symbol: string]: IDataProviderResponse }> {
    if (aSymbols.length <= 0) {
      return {};
    }

    try {
      const symbol = aSymbols[0];

      const scraperConfig = await this.getScraperConfigurationBySymbol(symbol);

      const { marketPrice } = await this.prisma.marketData.findFirst({
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
          currency: scraperConfig?.currency,
          marketState: MarketState.delayed,
          name: scraperConfig?.name
        }
      };
    } catch (error) {
      console.error(error);
    }

    return {};
  }

  public async getHistorical(
    aSymbols: string[],
    aGranularity: Granularity = 'day',
    from: Date,
    to: Date
  ): Promise<{
    [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
  }> {
    if (aSymbols.length <= 0) {
      return {};
    }

    try {
      const symbol = aSymbols[0];

      const scraperConfiguration = await this.getScraperConfigurationBySymbol(
        symbol
      );

      const get = bent(scraperConfiguration?.url, 'GET', 'string', 200, {});

      const html = await get();
      const $ = cheerio.load(html);

      const value = this.extractNumberFromString(
        $(scraperConfiguration?.selector).text()
      );

      return {
        [symbol]: {
          [format(getYesterday(), 'yyyy-MM-dd')]: {
            marketPrice: value
          }
        }
      };
    } catch (error) {
      console.error(error);
    }

    return {};
  }

  public async getScraperConfigurations(): Promise<ScraperConfig[]> {
    try {
      const {
        value: scraperConfigString
      } = await this.prisma.property.findFirst({
        select: {
          value: true
        },
        where: { key: 'SCRAPER_CONFIG' }
      });

      return JSON.parse(scraperConfigString);
    } catch {}

    return [];
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

  private async getScraperConfigurationBySymbol(aSymbol: string) {
    const scraperConfigurations = await this.getScraperConfigurations();
    return scraperConfigurations.find((scraperConfiguration) => {
      return scraperConfiguration.symbol === aSymbol;
    });
  }
}
