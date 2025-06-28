import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import {
  DataProviderInterface,
  GetAssetProfileParams,
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
  LookupResponse,
  ScraperConfiguration
} from '@ghostfolio/common/interfaces';

import { Injectable, Logger } from '@nestjs/common';
import { DataSource, SymbolProfile } from '@prisma/client';
import * as cheerio from 'cheerio';
import { addDays, format, isBefore } from 'date-fns';
import * as jsonpath from 'jsonpath';

@Injectable()
export class ManualService implements DataProviderInterface {
  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly prismaService: PrismaService,
    private readonly symbolProfileService: SymbolProfileService
  ) {}

  public canHandle() {
    return true;
  }

  public async getAssetProfile({
    symbol
  }: GetAssetProfileParams): Promise<Partial<SymbolProfile>> {
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
      dataSource: DataSource.MANUAL,
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
      const { defaultMarketPrice, selector, url } =
        symbolProfile?.scraperConfiguration ?? {};

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
      } else if (!selector || !url) {
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

      const symbolProfilesWithScraperConfigurationAndInstantMode =
        symbolProfiles.filter(({ scraperConfiguration }) => {
          return (
            scraperConfiguration?.mode === 'instant' &&
            scraperConfiguration?.selector &&
            scraperConfiguration?.url
          );
        });

      const scraperResultPromises =
        symbolProfilesWithScraperConfigurationAndInstantMode.map(
          async ({ scraperConfiguration, symbol }) => {
            try {
              const marketPrice = await this.scrape(scraperConfiguration);
              return { marketPrice, symbol };
            } catch (error) {
              Logger.error(
                `Could not get quote for ${symbol} (${this.getName()}): [${error.name}] ${error.message}`,
                'ManualService'
              );
              return { symbol, marketPrice: undefined };
            }
          }
        );

      // Wait for all scraping requests to complete concurrently
      const scraperResults = await Promise.all(scraperResultPromises);

      for (const { currency, symbol } of symbolProfiles) {
        let { marketPrice } =
          scraperResults.find((result) => {
            return result.symbol === symbol;
          }) ?? {};

        marketPrice =
          marketPrice ??
          marketData.find((marketDataItem) => {
            return marketDataItem.symbol === symbol;
          })?.marketPrice ??
          0;

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
    query,
    userId
  }: GetSearchParams): Promise<LookupResponse> {
    const items = await this.prismaService.symbolProfile.findMany({
      select: {
        assetClass: true,
        assetSubClass: true,
        currency: true,
        dataSource: true,
        name: true,
        symbol: true,
        userId: true
      },
      where: {
        AND: [
          {
            dataSource: this.getName()
          },
          {
            OR: [
              {
                name: {
                  mode: 'insensitive',
                  startsWith: query
                }
              },
              {
                symbol: {
                  mode: 'insensitive',
                  startsWith: query
                }
              }
            ]
          },
          {
            OR: [{ userId }, { userId: null }]
          }
        ]
      }
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
    let locale = scraperConfiguration.locale;

    const response = await fetch(scraperConfiguration.url, {
      headers: scraperConfiguration.headers as HeadersInit,
      signal: AbortSignal.timeout(
        this.configurationService.get('REQUEST_TIMEOUT')
      )
    });

    if (response.headers.get('content-type')?.includes('application/json')) {
      const data = await response.json();

      const value = String(
        jsonpath.query(data, scraperConfiguration.selector)[0]
      );

      return extractNumberFromString({ locale, value });
    } else {
      const $ = cheerio.load(await response.text());

      if (!locale) {
        try {
          locale = $('html').attr('lang');
        } catch {}
      }

      let value = $(scraperConfiguration.selector).first().text();

      const lines = value?.split('\n') ?? [];

      const lineWithDigits = lines.find((line) => {
        return /\d/.test(line);
      });

      if (lineWithDigits) {
        value = lineWithDigits;
      }

      return extractNumberFromString({
        locale,
        value
      });
    }
  }
}
