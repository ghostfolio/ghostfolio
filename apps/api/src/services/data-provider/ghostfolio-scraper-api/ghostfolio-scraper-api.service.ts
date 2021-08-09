import {
  DATE_FORMAT,
  getYesterday,
  isGhostfolioScraperApiSymbol
} from '@ghostfolio/common/helper';
import { Granularity } from '@ghostfolio/common/types';
import { Injectable } from '@nestjs/common';
import { DataSource } from '@prisma/client';
import * as bent from 'bent';
import * as cheerio from 'cheerio';
import { format } from 'date-fns';

import { DataProviderInterface } from '../../interfaces/data-provider.interface';
import {
  IDataGatheringItem,
  IDataProviderHistoricalResponse,
  IDataProviderResponse,
  MarketState
} from '../../interfaces/interfaces';
import { PrismaService } from '../../prisma.service';
import { ScraperConfig } from './interfaces/scraper-config.interface';

@Injectable()
export class GhostfolioScraperApiService implements DataProviderInterface {
  private static NUMERIC_REGEXP = /[-]{0,1}[\d]*[.,]{0,1}[\d]+/g;

  public constructor(private readonly prismaService: PrismaService) {}

  public canHandle(symbol: string) {
    return isGhostfolioScraperApiSymbol(symbol);
  }

  public async get(
    aSymbols: string[]
  ): Promise<{ [symbol: string]: IDataProviderResponse }> {
    if (aSymbols.length <= 0) {
      return {};
    }

    try {
      const symbol = aSymbols[0];

      const scraperConfig = await this.getScraperConfigurationBySymbol(symbol);

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
          currency: scraperConfig?.currency,
          dataSource: DataSource.GHOSTFOLIO,
          marketState: MarketState.delayed
        }
      };
    } catch (error) {
      console.error(error);
    }

    return {};
  }

  public async getCustomSymbolsToGather(
    startDate?: Date
  ): Promise<IDataGatheringItem[]> {
    const ghostfolioSymbolProfiles =
      await this.prismaService.symbolProfile.findMany({
        where: {
          dataSource: DataSource.GHOSTFOLIO
        }
      });

    return ghostfolioSymbolProfiles.map(({ dataSource, symbol }) => {
      return {
        dataSource,
        symbol,
        date: startDate
      };
    });
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
          [format(getYesterday(), DATE_FORMAT)]: {
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
      const { value: scraperConfigString } =
        await this.prismaService.property.findFirst({
          select: {
            value: true
          },
          where: { key: 'SCRAPER_CONFIG' }
        });

      return JSON.parse(scraperConfigString);
    } catch {}

    return [];
  }

  public async search(aSymbol: string) {
    return { items: [] };
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
