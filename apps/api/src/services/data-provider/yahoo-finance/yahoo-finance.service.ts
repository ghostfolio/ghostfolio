import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { CryptocurrencyService } from '@ghostfolio/api/services/cryptocurrency/cryptocurrency.service';
import { YahooFinanceDataEnhancerService } from '@ghostfolio/api/services/data-provider/data-enhancer/yahoo-finance/yahoo-finance.service';
import { DataProviderInterface } from '@ghostfolio/api/services/data-provider/interfaces/data-provider.interface';
import {
  IDataProviderHistoricalResponse,
  IDataProviderResponse
} from '@ghostfolio/api/services/interfaces/interfaces';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import { Granularity } from '@ghostfolio/common/types';
import { Injectable, Logger } from '@nestjs/common';
import { DataSource, SymbolProfile } from '@prisma/client';
import Big from 'big.js';
import { addDays, format, isSameDay } from 'date-fns';
import yahooFinance from 'yahoo-finance2';
import { Quote } from 'yahoo-finance2/dist/esm/src/modules/quote';

@Injectable()
export class YahooFinanceService implements DataProviderInterface {
  private baseCurrency: string;

  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly cryptocurrencyService: CryptocurrencyService,
    private readonly yahooFinanceDataEnhancerService: YahooFinanceDataEnhancerService
  ) {
    this.baseCurrency = this.configurationService.get('BASE_CURRENCY');
  }

  public canHandle(symbol: string) {
    return true;
  }

  public async getAssetProfile(
    aSymbol: string
  ): Promise<Partial<SymbolProfile>> {
    const { assetClass, assetSubClass, currency, name } =
      await this.yahooFinanceDataEnhancerService.getAssetProfile(aSymbol);

    return {
      assetClass,
      assetSubClass,
      currency,
      name,
      dataSource: this.getName(),
      symbol: aSymbol
    };
  }

  public async getDividends({
    from,
    granularity = 'day',
    symbol,
    to
  }: {
    from: Date;
    granularity: Granularity;
    symbol: string;
    to: Date;
  }) {
    if (isSameDay(from, to)) {
      to = addDays(to, 1);
    }

    try {
      const historicalResult = await yahooFinance.historical(
        this.yahooFinanceDataEnhancerService.convertToYahooFinanceSymbol(
          symbol
        ),
        {
          events: 'dividends',
          interval: granularity === 'month' ? '1mo' : '1d',
          period1: format(from, DATE_FORMAT),
          period2: format(to, DATE_FORMAT)
        }
      );

      const response: {
        [date: string]: IDataProviderHistoricalResponse;
      } = {};

      for (const historicalItem of historicalResult) {
        response[format(historicalItem.date, DATE_FORMAT)] = {
          marketPrice: this.getConvertedValue({
            symbol,
            value: historicalItem.dividends
          })
        };
      }

      return response;
    } catch (error) {
      Logger.error(
        `Could not get dividends for ${symbol} (${this.getName()}) from ${format(
          from,
          DATE_FORMAT
        )} to ${format(to, DATE_FORMAT)}: [${error.name}] ${error.message}`,
        'YahooFinanceService'
      );

      return {};
    }
  }

  public async getHistorical(
    aSymbol: string,
    aGranularity: Granularity = 'day',
    from: Date,
    to: Date
  ): Promise<{
    [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
  }> {
    if (isSameDay(from, to)) {
      to = addDays(to, 1);
    }

    try {
      const historicalResult = await yahooFinance.historical(
        this.yahooFinanceDataEnhancerService.convertToYahooFinanceSymbol(
          aSymbol
        ),
        {
          interval: '1d',
          period1: format(from, DATE_FORMAT),
          period2: format(to, DATE_FORMAT)
        }
      );

      const response: {
        [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
      } = {};

      response[aSymbol] = {};

      for (const historicalItem of historicalResult) {
        response[aSymbol][format(historicalItem.date, DATE_FORMAT)] = {
          marketPrice: this.getConvertedValue({
            symbol: aSymbol,
            value: historicalItem.close
          })
        };
      }

      return response;
    } catch (error) {
      throw new Error(
        `Could not get historical market data for ${aSymbol} (${this.getName()}) from ${format(
          from,
          DATE_FORMAT
        )} to ${format(to, DATE_FORMAT)}: [${error.name}] ${error.message}`
      );
    }
  }

  public getMaxNumberOfSymbolsPerRequest() {
    return 50;
  }

  public getName(): DataSource {
    return DataSource.YAHOO;
  }

  public async getQuotes(
    aSymbols: string[]
  ): Promise<{ [symbol: string]: IDataProviderResponse }> {
    if (aSymbols.length <= 0) {
      return {};
    }

    const yahooFinanceSymbols = aSymbols.map((symbol) =>
      this.yahooFinanceDataEnhancerService.convertToYahooFinanceSymbol(symbol)
    );

    try {
      const response: { [symbol: string]: IDataProviderResponse } = {};

      let quotes: Pick<
        Quote,
        'currency' | 'marketState' | 'regularMarketPrice' | 'symbol'
      >[] = [];

      try {
        quotes = await yahooFinance.quote(yahooFinanceSymbols);
      } catch (error) {
        Logger.error(error, 'YahooFinanceService');

        Logger.warn(
          'Fallback to yahooFinance.quoteSummary()',
          'YahooFinanceService'
        );

        quotes = await this.getQuotesWithQuoteSummary(yahooFinanceSymbols);
      }

      for (const quote of quotes) {
        // Convert symbols back
        const symbol =
          this.yahooFinanceDataEnhancerService.convertFromYahooFinanceSymbol(
            quote.symbol
          );

        response[symbol] = {
          currency: quote.currency,
          dataSource: this.getName(),
          marketState:
            quote.marketState === 'REGULAR' ||
            this.cryptocurrencyService.isCryptocurrency(symbol)
              ? 'open'
              : 'closed',
          marketPrice: quote.regularMarketPrice || 0
        };

        if (
          symbol === `${this.baseCurrency}GBP` &&
          yahooFinanceSymbols.includes(`${this.baseCurrency}GBp=X`)
        ) {
          // Convert GPB to GBp (pence)
          response[`${this.baseCurrency}GBp`] = {
            ...response[symbol],
            currency: 'GBp',
            marketPrice: this.getConvertedValue({
              symbol: `${this.baseCurrency}GBp`,
              value: response[symbol].marketPrice
            })
          };
        } else if (
          symbol === `${this.baseCurrency}ILS` &&
          yahooFinanceSymbols.includes(`${this.baseCurrency}ILA=X`)
        ) {
          // Convert ILS to ILA
          response[`${this.baseCurrency}ILA`] = {
            ...response[symbol],
            currency: 'ILA',
            marketPrice: this.getConvertedValue({
              symbol: `${this.baseCurrency}ILA`,
              value: response[symbol].marketPrice
            })
          };
        } else if (
          symbol === `${this.baseCurrency}ZAR` &&
          yahooFinanceSymbols.includes(`${this.baseCurrency}ZAc=X`)
        ) {
          // Convert ZAR to ZAc (cents)
          response[`${this.baseCurrency}ZAc`] = {
            ...response[symbol],
            currency: 'ZAc',
            marketPrice: this.getConvertedValue({
              symbol: `${this.baseCurrency}ZAc`,
              value: response[symbol].marketPrice
            })
          };
        }
      }

      if (yahooFinanceSymbols.includes(`${this.baseCurrency}USX=X`)) {
        // Convert USD to USX (cent)
        response[`${this.baseCurrency}USX`] = {
          currency: 'USX',
          dataSource: this.getName(),
          marketPrice: new Big(1).mul(100).toNumber(),
          marketState: 'open'
        };
      }

      return response;
    } catch (error) {
      Logger.error(error, 'YahooFinanceService');

      return {};
    }
  }

  public getTestSymbol() {
    return 'AAPL';
  }

  public async search(aQuery: string): Promise<{ items: LookupItem[] }> {
    const items: LookupItem[] = [];

    try {
      const searchResult = await yahooFinance.search(aQuery);

      const quotes = searchResult.quotes
        .filter((quote) => {
          // Filter out undefined symbols
          return quote.symbol;
        })
        .filter(({ quoteType, symbol }) => {
          return (
            (quoteType === 'CRYPTOCURRENCY' &&
              this.cryptocurrencyService.isCryptocurrency(
                symbol.replace(
                  new RegExp(`-${this.baseCurrency}$`),
                  this.baseCurrency
                )
              )) ||
            ['EQUITY', 'ETF', 'FUTURE', 'MUTUALFUND'].includes(quoteType)
          );
        })
        .filter(({ quoteType, symbol }) => {
          if (quoteType === 'CRYPTOCURRENCY') {
            // Only allow cryptocurrencies in base currency to avoid having redundancy in the database.
            // Transactions need to be converted manually to the base currency before
            return symbol.includes(this.baseCurrency);
          } else if (quoteType === 'FUTURE') {
            // Allow GC=F, but not MGC=F
            return symbol.length === 4;
          }

          return true;
        });

      const marketData = await yahooFinance.quote(
        quotes.map(({ symbol }) => {
          return symbol;
        })
      );

      for (const marketDataItem of marketData) {
        const quote = quotes.find((currentQuote) => {
          return currentQuote.symbol === marketDataItem.symbol;
        });

        const symbol =
          this.yahooFinanceDataEnhancerService.convertFromYahooFinanceSymbol(
            marketDataItem.symbol
          );

        const { assetClass, assetSubClass } =
          this.yahooFinanceDataEnhancerService.parseAssetClass({
            quoteType: quote.quoteType,
            shortName: quote.shortname
          });

        items.push({
          assetClass,
          assetSubClass,
          symbol,
          currency: marketDataItem.currency,
          dataSource: this.getName(),
          name: this.yahooFinanceDataEnhancerService.formatName({
            longName: quote.longname,
            quoteType: quote.quoteType,
            shortName: quote.shortname,
            symbol: quote.symbol
          })
        });
      }
    } catch (error) {
      Logger.error(error, 'YahooFinanceService');
    }

    return { items };
  }

  private getConvertedValue({
    symbol,
    value
  }: {
    symbol: string;
    value: number;
  }) {
    if (symbol === `${this.baseCurrency}GBp`) {
      // Convert GPB to GBp (pence)
      return new Big(value).mul(100).toNumber();
    } else if (symbol === `${this.baseCurrency}ILA`) {
      // Convert ILS to ILA
      return new Big(value).mul(100).toNumber();
    } else if (symbol === `${this.baseCurrency}ZAc`) {
      // Convert ZAR to ZAc (cents)
      return new Big(value).mul(100).toNumber();
    }

    return value;
  }

  private async getQuotesWithQuoteSummary(aYahooFinanceSymbols: string[]) {
    const quoteSummaryPromises = aYahooFinanceSymbols.map((symbol) => {
      return yahooFinance.quoteSummary(symbol).catch(() => {
        Logger.error(
          `Could not get quote summary for ${symbol}`,
          'YahooFinanceService'
        );
        return null;
      });
    });

    const quoteSummaryItems = await Promise.all(quoteSummaryPromises);

    return quoteSummaryItems
      .filter((item) => {
        return item !== null;
      })
      .map(({ price }) => {
        return price;
      });
  }
}
