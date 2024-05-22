import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import {
  DataProviderInterface,
  GetDividendsParams,
  GetHistoricalParams,
  GetQuotesParams,
  GetSearchParams
} from '@ghostfolio/api/services/data-provider/interfaces/data-provider.interface';
import {
  IDataProviderHistoricalResponse,
  IDataProviderResponse
} from '@ghostfolio/api/services/interfaces/interfaces';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { SymbolProfileService } from '@ghostfolio/api/services/symbol-profile/symbol-profile.service';
import {
  DATE_FORMAT,
  extractNumberFromString,
  getYesterday
} from '@ghostfolio/common/helper';
import {
  DataProviderInfo,
  ScraperConfiguration
} from '@ghostfolio/common/interfaces';

import { Injectable, Logger } from '@nestjs/common';
import { DataSource, SymbolProfile } from '@prisma/client';
import * as cheerio from 'cheerio';
import { isUUID } from 'class-validator';
import { addDays, format, isBefore } from 'date-fns';
import got, { Headers } from 'got';
import jsonpath from 'jsonpath';

@Injectable()
export class ManualService implements DataProviderInterface {
  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly prismaService: PrismaService,
    private readonly symbolProfileService: SymbolProfileService
  ) {}

  public canHandle(symbol: string) {
    return true;
  }

  public async getAssetProfile({
    symbol
  }: {
    symbol: string;
  }): Promise<Partial<SymbolProfile>> {
    const assetProfile: Partial<SymbolProfile> = {
      symbol,
      dataSource: this.getName()
    };

    const [symbolProfile] = await this.symbolProfileService.getSymbolProfiles([
      { symbol, dataSource: this.getName() }
    ]);

    if (symbolProfile) {
      assetProfile.currency = symbolProfile.currency;
      assetProfile.name = symbolProfile.name;
    }

    return assetProfile;
  }

  public getDataProviderInfo(): DataProviderInfo {
    return {
      isPremium: false
    };
  }

  public async getDividends({}: GetDividendsParams) {
    return {};
  }

  public async getHistorical({
    from,
    symbol,
    to
  }: GetHistoricalParams): Promise<{
    [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
  }> {
    try {
      const [symbolProfile] = await this.symbolProfileService.getSymbolProfiles(
        [{ symbol, dataSource: this.getName() }]
      );
      const {
        defaultMarketPrice,
        headers = {},
        selector,
        url
      } = symbolProfile?.scraperConfiguration ?? {};

      if (defaultMarketPrice) {
        const historical: {
          [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
        } = {
          [symbol]: {}
        };
        let date = from;

        while (isBefore(date, to)) {
          historical[symbol][format(date, DATE_FORMAT)] = {
            marketPrice: defaultMarketPrice
          };

          date = addDays(date, 1);
        }

        return historical;
      } else if (selector === undefined || url === undefined) {
        return {};
      }

      const value = await this.scrape(symbolProfile.scraperConfiguration);

      return {
        [symbol]: {
          [format(getYesterday(), DATE_FORMAT)]: {
            marketPrice: value
          }
        }
      };
    } catch (error) {
      throw new Error(
        `Could not get historical market data for ${symbol} (${this.getName()}) from ${format(
          from,
          DATE_FORMAT
        )} to ${format(to, DATE_FORMAT)}: [${error.name}] ${error.message}`
      );
    }
  }

  public getName(): DataSource {
    return DataSource.MANUAL;
  }

  public async getQuotes({
    symbols
  }: GetQuotesParams): Promise<{ [symbol: string]: IDataProviderResponse }> {
    const response: { [symbol: string]: IDataProviderResponse } = {};

    if (symbols.length <= 0) {
      return response;
    }

    try {
      const symbolProfiles = await this.symbolProfileService.getSymbolProfiles(
        symbols.map((symbol) => {
          return { symbol, dataSource: this.getName() };
        })
      );

      const marketData = await this.prismaService.marketData.findMany({
        distinct: ['symbol'],
        orderBy: {
          date: 'desc'
        },
        take: symbols.length,
        where: {
          symbol: {
            in: symbols
          }
        }
      });

      for (const { currency, symbol } of symbolProfiles) {
        let marketPrice = marketData.find((marketDataItem) => {
          return marketDataItem.symbol === symbol;
        })?.marketPrice;

        response[symbol] = {
          currency,
          marketPrice,
          dataSource: this.getName(),
          marketState: 'delayed'
        };
      }

      return response;
    } catch (error) {
      Logger.error(error, 'ManualService');
    }

    return {};
  }

  public getTestSymbol() {
    return undefined;
  }

  public async search({
    query
  }: GetSearchParams): Promise<{ items: LookupItem[] }> {
    let items = await this.prismaService.symbolProfile.findMany({
      select: {
        assetClass: true,
        assetSubClass: true,
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
              startsWith: query
            }
          },
          {
            dataSource: this.getName(),
            symbol: {
              mode: 'insensitive',
              startsWith: query
            }
          }
        ]
      }
    });

    items = items.filter(({ symbol }) => {
      // Remove UUID symbols (activities of type ITEM)
      return !isUUID(symbol);
    });

    return {
      items: items.map((item) => {
        return { ...item, dataProviderInfo: this.getDataProviderInfo() };
      })
    };
  }

  public async test(scraperConfiguration: ScraperConfiguration) {
    return this.scrape(scraperConfiguration);
  }

  private async scrape(
    scraperConfiguration: ScraperConfiguration
  ): Promise<number> {
    try {
      const abortController = new AbortController();

      setTimeout(() => {
        abortController.abort();
      }, this.configurationService.get('REQUEST_TIMEOUT'));

      let locale = scraperConfiguration.locale;
      const { body, headers } = await got(scraperConfiguration.url, {
        headers: scraperConfiguration.headers as Headers,
        // @ts-ignore
        signal: abortController.signal
      });

      let factor = isNaN(+scraperConfiguration.postprocessor)
        ? 1.0
        : +scraperConfiguration.postprocessor;
      if (headers['content-type'] === 'application/json') {
        const data = JSON.parse(body);
        const value = String(
          jsonpath.query(data, scraperConfiguration.selector)[0]
        );
        return factor * extractNumberFromString({ locale, value });
      } else {
        const $ = cheerio.load(body);

        if (!locale) {
          try {
            locale = $('html').attr('lang');
          } catch {}
        }

        return (
          factor *
          extractNumberFromString({
            locale,
            value: $(scraperConfiguration.selector).first().text()
          })
        );
      }
    } catch (error) {
      throw error;
    }
  }
}
