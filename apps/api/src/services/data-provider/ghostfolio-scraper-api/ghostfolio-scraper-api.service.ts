import { getYesterday } from '@ghostfolio/helper';
import { Injectable } from '@nestjs/common';
import * as bent from 'bent';
import * as cheerio from 'cheerio';
import { format } from 'date-fns';

import { DataProviderInterface } from '../../interfaces/data-provider.interface';
import { Granularity } from '../../interfaces/granularity.type';
import {
  IDataProviderHistoricalResponse,
  IDataProviderResponse
} from '../../interfaces/interfaces';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class GhostfolioScraperApiService implements DataProviderInterface {
  public constructor(private prisma: PrismaService) {}

  public async get(
    aSymbols: string[]
  ): Promise<{ [symbol: string]: IDataProviderResponse }> {
    if (aSymbols.length <= 0) {
      return {};
    }

    try {
      const symbol = aSymbols[0];

      const scraperConfig = await this.getScraperConfig(symbol);

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
          isMarketOpen: false,
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

      const scraperConfig = await this.getScraperConfig(symbol);

      const get = bent(scraperConfig?.url, 'GET', 'string', 200, {});

      const html = await get();
      const $ = cheerio.load(html);

      const string = $(scraperConfig?.selector)
        .text()
        .replace('CHF', '')
        .trim();

      const value = parseFloat(string);

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

  private async getScraperConfig(aSymbol: string) {
    try {
      const {
        value: scraperConfigString
      } = await this.prisma.property.findFirst({
        select: {
          value: true
        },
        where: { key: 'SCRAPER_CONFIG' }
      });

      return JSON.parse(scraperConfigString).find((item) => {
        return item.symbol === aSymbol;
      });
    } catch {}

    return {};
  }
}
