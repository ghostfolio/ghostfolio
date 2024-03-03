import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { CryptocurrencyService } from '@ghostfolio/api/services/cryptocurrency/cryptocurrency.service';
import { YahooFinanceDataEnhancerService } from '@ghostfolio/api/services/data-provider/data-enhancer/yahoo-finance/yahoo-finance.service';
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
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import { DataProviderInfo } from '@ghostfolio/common/interfaces';

import { Injectable, Logger } from '@nestjs/common';
import { DataSource, SymbolProfile } from '@prisma/client';
import { addDays, format, isSameDay } from 'date-fns';
import yahooFinance from 'yahoo-finance2';
import { Quote } from 'yahoo-finance2/dist/esm/src/modules/quote';

@Injectable()
export class YahooFinanceService implements DataProviderInterface {
  public constructor(
    private readonly cryptocurrencyService: CryptocurrencyService,
    private readonly yahooFinanceDataEnhancerService: YahooFinanceDataEnhancerService
  ) {}

  public canHandle(symbol: string) {
    return true;
  }

  public async getAssetProfile({
    symbol
  }: {
    symbol: string;
  }): Promise<Partial<SymbolProfile>> {
    return this.yahooFinanceDataEnhancerService.getAssetProfile(symbol);
  }

  public getDataProviderInfo(): DataProviderInfo {
    return {
      isPremium: false
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
      const historicalResult = await yahooFinance.historical(
        this.yahooFinanceDataEnhancerService.convertToYahooFinanceSymbol(
          symbol
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

      response[symbol] = {};

      for (const historicalItem of historicalResult) {
        response[symbol][format(historicalItem.date, DATE_FORMAT)] = {
          marketPrice: historicalItem.close
        };
      }

      return response;
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
  }: GetSearchParams): Promise<{ items: LookupItem[] }> {
    const items: LookupItem[] = [];

    try {
      const quoteTypes = ['EQUITY', 'ETF', 'FUTURE', 'MUTUALFUND'];

      if (includeIndices) {
        quoteTypes.push('INDEX');
      }

      const searchResult = await yahooFinance.search(query);

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
