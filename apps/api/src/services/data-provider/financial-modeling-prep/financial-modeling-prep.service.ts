import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { CryptocurrencyService } from '@ghostfolio/api/services/cryptocurrency/cryptocurrency.service';
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
import {
  DEFAULT_CURRENCY,
  REPLACE_NAME_PARTS
} from '@ghostfolio/common/config';
import { DATE_FORMAT, isCurrency, parseDate } from '@ghostfolio/common/helper';
import {
  DataProviderInfo,
  LookupItem,
  LookupResponse
} from '@ghostfolio/common/interfaces';

import { Injectable, Logger } from '@nestjs/common';
import {
  AssetClass,
  AssetSubClass,
  DataSource,
  SymbolProfile
} from '@prisma/client';
import { isISIN } from 'class-validator';
import { countries } from 'countries-list';
import {
  addDays,
  addYears,
  format,
  isAfter,
  isBefore,
  isSameDay,
  parseISO
} from 'date-fns';

@Injectable()
export class FinancialModelingPrepService implements DataProviderInterface {
  private apiKey: string;
  private readonly URL = this.getUrl({ version: 3 });

  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly cryptocurrencyService: CryptocurrencyService
  ) {
    this.apiKey = this.configurationService.get(
      'API_KEY_FINANCIAL_MODELING_PREP'
    );
  }

  public canHandle() {
    return true;
  }

  public async getAssetProfile({
    requestTimeout = this.configurationService.get('REQUEST_TIMEOUT'),
    symbol
  }: GetAssetProfileParams): Promise<Partial<SymbolProfile>> {
    const response: Partial<SymbolProfile> = {
      symbol,
      dataSource: this.getName()
    };

    try {
      if (
        isCurrency(symbol.substring(0, symbol.length - DEFAULT_CURRENCY.length))
      ) {
        response.assetClass = AssetClass.LIQUIDITY;
        response.assetSubClass = AssetSubClass.CASH;
        response.currency = symbol.substring(
          symbol.length - DEFAULT_CURRENCY.length
        );
      } else if (this.cryptocurrencyService.isCryptocurrency(symbol)) {
        const [quote] = await fetch(
          `${this.URL}/quote/${symbol}?apikey=${this.apiKey}`,
          {
            signal: AbortSignal.timeout(requestTimeout)
          }
        ).then((res) => res.json());

        response.assetClass = AssetClass.LIQUIDITY;
        response.assetSubClass = AssetSubClass.CRYPTOCURRENCY;
        response.currency = symbol.substring(
          symbol.length - DEFAULT_CURRENCY.length
        );
        response.name = quote.name;
      } else {
        const [assetProfile] = await fetch(
          `${this.URL}/profile/${symbol}?apikey=${this.apiKey}`,
          {
            signal: AbortSignal.timeout(requestTimeout)
          }
        ).then((res) => res.json());

        const { assetClass, assetSubClass } =
          this.parseAssetClass(assetProfile);

        response.assetClass = assetClass;
        response.assetSubClass = assetSubClass;

        if (assetSubClass === AssetSubClass.ETF) {
          const etfCountryWeightings = await fetch(
            `${this.URL}/etf-country-weightings/${symbol}?apikey=${this.apiKey}`,
            {
              signal: AbortSignal.timeout(requestTimeout)
            }
          ).then((res) => res.json());

          response.countries = etfCountryWeightings.map(
            ({ country: countryName, weightPercentage }) => {
              let countryCode: string;

              for (const [code, country] of Object.entries(countries)) {
                if (country.name === countryName) {
                  countryCode = code;
                  break;
                }
              }

              return {
                code: countryCode,
                weight: parseFloat(weightPercentage.slice(0, -1)) / 100
              };
            }
          );

          const [etfInformation] = await fetch(
            `${this.getUrl({ version: 4 })}/etf-info?symbol=${symbol}&apikey=${this.apiKey}`,
            {
              signal: AbortSignal.timeout(requestTimeout)
            }
          ).then((res) => res.json());

          if (etfInformation.website) {
            response.url = etfInformation.website;
          }

          const [portfolioDate] = await fetch(
            `${this.getUrl({ version: 4 })}/etf-holdings/portfolio-date?symbol=${symbol}&apikey=${this.apiKey}`,
            {
              signal: AbortSignal.timeout(requestTimeout)
            }
          ).then((res) => res.json());

          if (portfolioDate) {
            const etfHoldings = await fetch(
              `${this.getUrl({ version: 4 })}/etf-holdings?date=${portfolioDate.date}&symbol=${symbol}&apikey=${this.apiKey}`,
              {
                signal: AbortSignal.timeout(requestTimeout)
              }
            ).then((res) => res.json());

            const sortedTopHoldings = etfHoldings
              .sort((a, b) => {
                return b.pctVal - a.pctVal;
              })
              .slice(0, 10);

            response.holdings = sortedTopHoldings.map(({ name, pctVal }) => {
              return { name, weight: pctVal / 100 };
            });
          }

          const etfSectorWeightings = await fetch(
            `${this.URL}/etf-sector-weightings/${symbol}?apikey=${this.apiKey}`,
            {
              signal: AbortSignal.timeout(requestTimeout)
            }
          ).then((res) => res.json());

          response.sectors = etfSectorWeightings.map(
            ({ sector, weightPercentage }) => {
              return {
                name: sector,
                weight: parseFloat(weightPercentage.slice(0, -1)) / 100
              };
            }
          );
        } else if (assetSubClass === AssetSubClass.STOCK) {
          if (assetProfile.country) {
            response.countries = [{ code: assetProfile.country, weight: 1 }];
          }

          if (assetProfile.sector) {
            response.sectors = [{ name: assetProfile.sector, weight: 1 }];
          }
        }

        response.currency = assetProfile.currency;

        if (assetProfile.isin) {
          response.isin = assetProfile.isin;
        }

        response.name = this.formatName({ name: assetProfile.companyName });

        if (assetProfile.website) {
          response.url = assetProfile.website;
        }
      }
    } catch (error) {
      let message = error;

      if (error?.name === 'AbortError') {
        message = `RequestError: The operation to get the asset profile for ${symbol} was aborted because the request to the data provider took more than ${(
          requestTimeout / 1000
        ).toFixed(3)} seconds`;
      }

      Logger.error(message, 'FinancialModelingPrepService');
    }

    return response;
  }

  public getDataProviderInfo(): DataProviderInfo {
    return {
      isPremium: true,
      name: 'Financial Modeling Prep',
      url: 'https://financialmodelingprep.com/developer/docs'
    };
  }

  public async getDividends({
    from,
    requestTimeout = this.configurationService.get('REQUEST_TIMEOUT'),
    symbol,
    to
  }: GetDividendsParams) {
    if (isSameDay(from, to)) {
      to = addDays(to, 1);
    }

    try {
      const response: {
        [date: string]: IDataProviderHistoricalResponse;
      } = {};

      const { historical = [] } = await fetch(
        `${this.URL}/historical-price-full/stock_dividend/${symbol}?apikey=${this.apiKey}`,
        {
          signal: AbortSignal.timeout(requestTimeout)
        }
      ).then((res) => res.json());

      historical
        .filter(({ date }) => {
          return (
            (isSameDay(parseISO(date), from) ||
              isAfter(parseISO(date), from)) &&
            isBefore(parseISO(date), to)
          );
        })
        .forEach(({ adjDividend, date }) => {
          response[date] = {
            marketPrice: adjDividend
          };
        });

      return response;
    } catch (error) {
      Logger.error(
        `Could not get dividends for ${symbol} (${this.getName()}) from ${format(
          from,
          DATE_FORMAT
        )} to ${format(to, DATE_FORMAT)}: [${error.name}] ${error.message}`,
        'FinancialModelingPrepService'
      );

      return {};
    }
  }

  public async getHistorical({
    from,
    requestTimeout = this.configurationService.get('REQUEST_TIMEOUT'),
    symbol,
    to
  }: GetHistoricalParams): Promise<{
    [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
  }> {
    const MAX_YEARS_PER_REQUEST = 5;
    const result: {
      [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
    } = {
      [symbol]: {}
    };

    let currentFrom = from;

    try {
      while (isBefore(currentFrom, to) || isSameDay(currentFrom, to)) {
        const currentTo = isBefore(
          addYears(currentFrom, MAX_YEARS_PER_REQUEST),
          to
        )
          ? addYears(currentFrom, MAX_YEARS_PER_REQUEST)
          : to;

        const { historical = [] } = await fetch(
          `${this.URL}/historical-price-full/${symbol}?apikey=${this.apiKey}&from=${format(currentFrom, DATE_FORMAT)}&to=${format(currentTo, DATE_FORMAT)}`,
          {
            signal: AbortSignal.timeout(requestTimeout)
          }
        ).then((res) => res.json());

        for (const { adjClose, date } of historical) {
          if (
            (isSameDay(parseDate(date), currentFrom) ||
              isAfter(parseDate(date), currentFrom)) &&
            isBefore(parseDate(date), currentTo)
          ) {
            result[symbol][date] = {
              marketPrice: adjClose
            };
          }
        }

        currentFrom = addYears(currentFrom, MAX_YEARS_PER_REQUEST);
      }

      return result;
    } catch (error) {
      throw new Error(
        `Could not get historical market data for ${symbol} (${this.getName()}) from ${format(
          from,
          DATE_FORMAT
        )} to ${format(to, DATE_FORMAT)}: [${error.name}] ${error.message}`
      );
    }
  }

  public getMaxNumberOfSymbolsPerRequest() {
    return 20;
  }

  public getName(): DataSource {
    return DataSource.FINANCIAL_MODELING_PREP;
  }

  public async getQuotes({
    requestTimeout = this.configurationService.get('REQUEST_TIMEOUT'),
    symbols
  }: GetQuotesParams): Promise<{ [symbol: string]: IDataProviderResponse }> {
    const response: { [symbol: string]: IDataProviderResponse } = {};

    if (symbols.length <= 0) {
      return response;
    }

    try {
      const quotes = await fetch(
        `${this.getUrl({ version: 'stable' })}/batch-quote-short?symbols=${symbols.join(',')}&apikey=${this.apiKey}`,
        {
          signal: AbortSignal.timeout(requestTimeout)
        }
      ).then((res) => res.json());

      for (const { price, symbol } of quotes) {
        const { currency } = await this.getAssetProfile({ symbol });

        response[symbol] = {
          currency,
          dataProviderInfo: this.getDataProviderInfo(),
          dataSource: DataSource.FINANCIAL_MODELING_PREP,
          marketPrice: price,
          marketState: 'delayed'
        };
      }
    } catch (error) {
      let message = error;

      if (error?.name === 'AbortError') {
        message = `RequestError: The operation to get the quotes was aborted because the request to the data provider took more than ${(
          requestTimeout / 1000
        ).toFixed(3)} seconds`;
      }

      Logger.error(message, 'FinancialModelingPrepService');
    }

    return response;
  }

  public getTestSymbol() {
    return 'AAPL';
  }

  public async search({ query }: GetSearchParams): Promise<LookupResponse> {
    let items: LookupItem[] = [];

    try {
      if (isISIN(query)) {
        const result = await fetch(
          `${this.getUrl({ version: 4 })}/search/isin?isin=${query}&apikey=${this.apiKey}`,
          {
            signal: AbortSignal.timeout(
              this.configurationService.get('REQUEST_TIMEOUT')
            )
          }
        ).then((res) => res.json());

        items = result.map(({ companyName, currency, symbol }) => {
          return {
            currency,
            symbol,
            assetClass: undefined, // TODO
            assetSubClass: undefined, // TODO
            dataProviderInfo: this.getDataProviderInfo(),
            dataSource: this.getName(),
            name: this.formatName({ name: companyName })
          };
        });
      } else {
        const result = await fetch(
          `${this.URL}/search?query=${query}&apikey=${this.apiKey}`,
          {
            signal: AbortSignal.timeout(
              this.configurationService.get('REQUEST_TIMEOUT')
            )
          }
        ).then((res) => res.json());

        items = result.map(({ currency, name, symbol }) => {
          return {
            currency,
            symbol,
            assetClass: undefined, // TODO
            assetSubClass: undefined, // TODO
            dataProviderInfo: this.getDataProviderInfo(),
            dataSource: this.getName(),
            name: this.formatName({ name })
          };
        });
      }
    } catch (error) {
      let message = error;

      if (error?.name === 'AbortError') {
        message = `RequestError: The operation to search for ${query} was aborted because the request to the data provider took more than ${(
          this.configurationService.get('REQUEST_TIMEOUT') / 1000
        ).toFixed(3)} seconds`;
      }

      Logger.error(message, 'FinancialModelingPrepService');
    }

    return { items };
  }

  private formatName({ name }: { name: string }) {
    if (name) {
      for (const part of REPLACE_NAME_PARTS) {
        name = name.replace(part, '');
      }

      name = name.trim();
    }

    return name;
  }

  private getUrl({ version }: { version: number | 'stable' }) {
    const baseUrl = 'https://financialmodelingprep.com';

    if (version === 'stable') {
      return `${baseUrl}/stable`;
    }

    return `${baseUrl}/api/v${version}`;
  }

  private parseAssetClass(profile: any): {
    assetClass: AssetClass;
    assetSubClass: AssetSubClass;
  } {
    let assetClass: AssetClass;
    let assetSubClass: AssetSubClass;

    if (profile) {
      if (profile.isEtf) {
        assetClass = AssetClass.EQUITY;
        assetSubClass = AssetSubClass.ETF;
      } else if (profile.isFund) {
        assetClass = AssetClass.EQUITY;
        assetSubClass = AssetSubClass.MUTUALFUND;
      } else {
        assetClass = AssetClass.EQUITY;
        assetSubClass = AssetSubClass.STOCK;
      }
    }

    return { assetClass, assetSubClass };
  }
}
