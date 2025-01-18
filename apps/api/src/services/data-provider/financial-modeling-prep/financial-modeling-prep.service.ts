import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { CryptocurrencyService } from '@ghostfolio/api/services/cryptocurrency/cryptocurrency.service';
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
import { DEFAULT_CURRENCY } from '@ghostfolio/common/config';
import { DATE_FORMAT, parseDate } from '@ghostfolio/common/helper';
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
import { format, isAfter, isBefore, isSameDay } from 'date-fns';

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
    symbol
  }: {
    symbol: string;
  }): Promise<Partial<SymbolProfile>> {
    const response: Partial<SymbolProfile> = {
      symbol,
      dataSource: this.getName()
    };

    try {
      if (this.cryptocurrencyService.isCryptocurrency(symbol)) {
        const [quote] = await fetch(
          `${this.URL}/quote/${symbol}?apikey=${this.apiKey}`,
          {
            signal: AbortSignal.timeout(
              this.configurationService.get('REQUEST_TIMEOUT')
            )
          }
        ).then((res) => res.json());

        response.assetClass = AssetClass.LIQUIDITY;
        response.assetSubClass = AssetSubClass.CRYPTOCURRENCY;
        response.currency = symbol.substring(symbol.length - 3);
        response.name = quote.name;
      } else {
        const [assetProfile] = await fetch(
          `${this.URL}/profile/${symbol}?apikey=${this.apiKey}`,
          {
            signal: AbortSignal.timeout(
              this.configurationService.get('REQUEST_TIMEOUT')
            )
          }
        ).then((res) => res.json());

        const { assetClass, assetSubClass } =
          this.parseAssetClass(assetProfile);

        response.assetClass = assetClass;
        response.assetSubClass = assetSubClass;
        response.currency = assetProfile.currency;
        response.name = assetProfile.companyName;

        if (assetSubClass === AssetSubClass.STOCK) {
          if (assetProfile.country) {
            response.countries = [{ code: assetProfile.country, weight: 1 }];
          }

          if (assetProfile.sector) {
            response.sectors = [{ name: assetProfile.sector, weight: 1 }];
          }
        }

        if (assetProfile.website) {
          response.url = assetProfile.website;
        }
      }
    } catch (error) {
      let message = error;

      if (error?.name === 'AbortError') {
        message = `RequestError: The operation to get the asset profile for ${symbol} was aborted because the request to the data provider took more than ${(
          this.configurationService.get('REQUEST_TIMEOUT') / 1000
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

  public async getDividends({}: GetDividendsParams) {
    return {};
  }

  public async getHistorical({
    from,
    requestTimeout = this.configurationService.get('REQUEST_TIMEOUT'),
    symbol,
    to
  }: GetHistoricalParams): Promise<{
    [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
  }> {
    try {
      const { historical } = await fetch(
        `${this.URL}/historical-price-full/${symbol}?apikey=${this.apiKey}`,
        {
          signal: AbortSignal.timeout(requestTimeout)
        }
      ).then((res) => res.json());

      const result: {
        [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
      } = {
        [symbol]: {}
      };

      for (const { close, date } of historical) {
        if (
          (isSameDay(parseDate(date), from) ||
            isAfter(parseDate(date), from)) &&
          isBefore(parseDate(date), to)
        ) {
          result[symbol][date] = {
            marketPrice: close
          };
        }
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
        `${this.URL}/quote/${symbols.join(',')}?apikey=${this.apiKey}`,
        {
          signal: AbortSignal.timeout(requestTimeout)
        }
      ).then((res) => res.json());

      for (const { price, symbol } of quotes) {
        response[symbol] = {
          currency: DEFAULT_CURRENCY,
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
          this.configurationService.get('REQUEST_TIMEOUT') / 1000
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
            name: companyName
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
            name,
            symbol,
            assetClass: undefined, // TODO
            assetSubClass: undefined, // TODO
            dataProviderInfo: this.getDataProviderInfo(),
            dataSource: this.getName()
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

  private getUrl({ version }: { version: number }) {
    return `https://financialmodelingprep.com/api/v${version}`;
  }

  public parseAssetClass(profile: any): {
    assetClass: AssetClass;
    assetSubClass: AssetSubClass;
  } {
    let assetClass: AssetClass;
    let assetSubClass: AssetSubClass;

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

    return { assetClass, assetSubClass };
  }
}
