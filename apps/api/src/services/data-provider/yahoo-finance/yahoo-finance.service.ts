import { CryptocurrencyService } from '@ghostfolio/api/services/cryptocurrency/cryptocurrency.service';
import { YahooFinanceDataEnhancerService } from '@ghostfolio/api/services/data-provider/data-enhancer/yahoo-finance/yahoo-finance.service';
import { AssetProfileDelistedError } from '@ghostfolio/api/services/data-provider/errors/asset-profile-delisted.error';
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
import { DEFAULT_CURRENCY } from '@ghostfolio/common/config';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import {
  DataProviderInfo,
  LookupItem,
  LookupResponse
} from '@ghostfolio/common/interfaces';

import { Injectable, Logger } from '@nestjs/common';
import { DataSource, SymbolProfile } from '@prisma/client';
import { addDays, format, isSameDay } from 'date-fns';
import YahooFinance from 'yahoo-finance2';
import { ChartResultArray } from 'yahoo-finance2/esm/src/modules/chart';
import {
  HistoricalDividendsResult,
  HistoricalHistoryResult
} from 'yahoo-finance2/esm/src/modules/historical';
import {
  Quote,
  QuoteResponseArray
} from 'yahoo-finance2/esm/src/modules/quote';
import { SearchQuoteNonYahoo } from 'yahoo-finance2/esm/src/modules/search';

@Injectable()
export class YahooFinanceService implements DataProviderInterface {
  private readonly yahooFinance = new YahooFinance({
    suppressNotices: ['yahooSurvey']
  });

  public constructor(
    private readonly cryptocurrencyService: CryptocurrencyService,
    private readonly yahooFinanceDataEnhancerService: YahooFinanceDataEnhancerService
  ) {}

  public canHandle() {
    return true;
  }

  public async getAssetProfile({
    symbol
  }: GetAssetProfileParams): Promise<Partial<SymbolProfile>> {
    return this.yahooFinanceDataEnhancerService.getAssetProfile(symbol);
  }

  public getDataProviderInfo(): DataProviderInfo {
    return {
      dataSource: DataSource.YAHOO,
      isPremium: false,
      name: 'Yahoo Finance',
      url: 'https://finance.yahoo.com'
    };
  }

  public async getDividends({
    from,
    granularity = 'day',
    symbol,
    to
  }: GetDividendsParams) {
    if (isSameDay(from, to)) {
      to = addDays(to, 1);
    }

    try {
      const historicalResult = this.convertToDividendResult(
        await this.yahooFinance.chart(
          this.yahooFinanceDataEnhancerService.convertToYahooFinanceSymbol(
            symbol
          ),
          {
            events: 'dividends',
            interval: granularity === 'month' ? '1mo' : '1d',
            period1: format(from, DATE_FORMAT),
            period2: format(to, DATE_FORMAT)
          }
        )
      );
      const response: {
        [date: string]: IDataProviderHistoricalResponse;
      } = {};

      for (const historicalItem of historicalResult) {
        response[format(historicalItem.date, DATE_FORMAT)] = {
          marketPrice: historicalItem.dividends
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

  public async getHistorical({
    from,
    symbol,
    to
  }: GetHistoricalParams): Promise<{
    [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
  }> {
    if (isSameDay(from, to)) {
      to = addDays(to, 1);
    }

    try {
      const historicalResult = this.convertToHistoricalResult(
        await this.yahooFinance.chart(
          this.yahooFinanceDataEnhancerService.convertToYahooFinanceSymbol(
            symbol
          ),
          {
            interval: '1d',
            period1: format(from, DATE_FORMAT),
            period2: format(to, DATE_FORMAT)
          }
        )
      );

      const response: {
        [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
      } = {};

      response[symbol] = {};

      for (const historicalItem of historicalResult) {
        response[symbol][format(historicalItem.date, DATE_FORMAT)] = {
          marketPrice: historicalItem.close
        };
      }

      return response;
    } catch (error) {
      if (error.message === 'No data found, symbol may be delisted') {
        throw new AssetProfileDelistedError(
          `No data found, ${symbol} (${this.getName()}) may be delisted`
        );
      } else {
        throw new Error(
          `Could not get historical market data for ${symbol} (${this.getName()}) from ${format(
            from,
            DATE_FORMAT
          )} to ${format(to, DATE_FORMAT)}: [${error.name}] ${error.message}`
        );
      }
    }
  }

  public getMaxNumberOfSymbolsPerRequest() {
    return 50;
  }

  public getName(): DataSource {
    return DataSource.YAHOO;
  }

  public async getQuotes({
    symbols
  }: GetQuotesParams): Promise<{ [symbol: string]: IDataProviderResponse }> {
    const response: { [symbol: string]: IDataProviderResponse } = {};

    if (symbols.length <= 0) {
      return response;
    }

    const yahooFinanceSymbols = symbols.map((symbol) =>
      this.yahooFinanceDataEnhancerService.convertToYahooFinanceSymbol(symbol)
    );

    try {
      let quotes: Pick<
        Quote,
        'currency' | 'marketState' | 'regularMarketPrice' | 'symbol'
      >[] = [];

      try {
        quotes = await this.yahooFinance.quote(yahooFinanceSymbols);
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

  public async search({
    includeIndices = false,
    query
  }: GetSearchParams): Promise<LookupResponse> {
    const items: LookupItem[] = [];

    try {
      const quoteTypes = ['EQUITY', 'ETF', 'FUTURE', 'MUTUALFUND'];

      if (includeIndices) {
        quoteTypes.push('INDEX');
      }

      const searchResult = await this.yahooFinance.search(query);

      const quotes = searchResult.quotes
        .filter(
          (quote): quote is Exclude<typeof quote, SearchQuoteNonYahoo> => {
            // Filter out undefined symbols
            return !!quote.symbol;
          }
        )
        .filter(({ quoteType, symbol }) => {
          return (
            (quoteType === 'CRYPTOCURRENCY' &&
              this.cryptocurrencyService.isCryptocurrency(
                symbol.replace(
                  new RegExp(`-${DEFAULT_CURRENCY}$`),
                  DEFAULT_CURRENCY
                )
              )) ||
            quoteTypes.includes(quoteType)
          );
        })
        .filter(({ quoteType, symbol }) => {
          if (quoteType === 'CRYPTOCURRENCY') {
            // Only allow cryptocurrencies in base currency to avoid having redundancy in the database.
            // Transactions need to be converted manually to the base currency before
            return symbol.includes(DEFAULT_CURRENCY);
          } else if (quoteType === 'FUTURE') {
            // Allow GC=F, but not MGC=F
            return symbol.length === 4;
          }

          return true;
        });

      let marketData: QuoteResponseArray = [];

      try {
        marketData = await this.yahooFinance.quote(
          quotes.map(({ symbol }) => {
            return symbol;
          })
        );
      } catch (error) {
        if (error?.result?.length > 0) {
          marketData = error.result;
        }
      }

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
          dataProviderInfo: this.getDataProviderInfo(),
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

  private convertToDividendResult(
    result: ChartResultArray
  ): HistoricalDividendsResult {
    return result.events.dividends.map(({ amount: dividends, date }) => {
      return { date, dividends };
    });
  }

  private convertToHistoricalResult(
    result: ChartResultArray
  ): HistoricalHistoryResult {
    return result.quotes;
  }

  private async getQuotesWithQuoteSummary(aYahooFinanceSymbols: string[]) {
    const quoteSummaryPromises = aYahooFinanceSymbols.map((symbol) => {
      return this.yahooFinance.quoteSummary(symbol).catch(() => {
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
