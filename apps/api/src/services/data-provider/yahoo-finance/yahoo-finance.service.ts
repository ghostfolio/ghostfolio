import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
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
import { DEFAULT_CURRENCY } from '@ghostfolio/common/config';
import { DATE_FORMAT } from '@ghostfolio/common/helper';
import {
  DataProviderHistoricalResponse,
  DataProviderInfo,
  DataProviderResponse,
  LookupItem,
  LookupResponse
} from '@ghostfolio/common/interfaces';

import { Injectable, Logger } from '@nestjs/common';
import { DataSource, SymbolProfile } from '@prisma/client';
import { addDays, format, isSameDay, isValid } from 'date-fns';
import { ReasonPhrases, StatusCodes } from 'http-status-codes';
import { uniqBy } from 'lodash';
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
import {
  Price,
  QuoteSummaryResult
} from 'yahoo-finance2/esm/src/modules/quoteSummary';
import { SearchQuoteNonYahoo } from 'yahoo-finance2/esm/src/modules/search';

@Injectable()
export class YahooFinanceService implements DataProviderInterface {
  private static readonly DELISTED_ERROR_MESSAGE =
    'No data found, symbol may be delisted';

  private static readonly RATE_LIMIT_ERROR_MESSAGE =
    ReasonPhrases.TOO_MANY_REQUESTS;

  private readonly logger = new Logger(YahooFinanceService.name);

  private readonly yahooFinance = new YahooFinance({
    suppressNotices: ['yahooSurvey']
  });

  public constructor(
    private readonly configurationService: ConfigurationService,
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
    requestTimeout = this.configurationService.get('REQUEST_TIMEOUT'),
    symbol,
    to
  }: GetDividendsParams) {
    if (!isValid(from) || !isValid(to)) {
      this.logger.error(
        `Could not get dividends for ${symbol} (${this.getName()}): Invalid date range`
      );

      return {};
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
            period2: format(
              isSameDay(from, to) ? addDays(to, 1) : to,
              DATE_FORMAT
            )
          },
          {
            fetchOptions: { signal: AbortSignal.timeout(requestTimeout) }
          }
        )
      );
      const response: {
        [date: string]: DataProviderHistoricalResponse;
      } = {};

      for (const historicalItem of historicalResult) {
        response[format(historicalItem.date, DATE_FORMAT)] = {
          marketPrice: historicalItem.dividends
        };
      }

      return response;
    } catch (error) {
      const message = `Could not get dividends for ${symbol} (${this.getName()}) from ${format(
        from,
        DATE_FORMAT
      )} to ${format(to, DATE_FORMAT)}`;

      if (error?.message === YahooFinanceService.DELISTED_ERROR_MESSAGE) {
        this.logger.warn(
          `${message}: ${YahooFinanceService.DELISTED_ERROR_MESSAGE}`
        );
      } else if (
        (error?.name === 'HTTPError' &&
          error?.code === StatusCodes.TOO_MANY_REQUESTS) ||
        error?.message?.startsWith(YahooFinanceService.RATE_LIMIT_ERROR_MESSAGE)
      ) {
        this.logger.warn(
          `${message}: ${YahooFinanceService.RATE_LIMIT_ERROR_MESSAGE}`
        );
      } else {
        this.logger.error(`${message}: [${error?.name}] ${error?.message}`);
      }

      return {};
    }
  }

  public async getHistorical({
    from,
    requestTimeout = this.configurationService.get('REQUEST_TIMEOUT'),
    symbol,
    to
  }: GetHistoricalParams): Promise<{
    [date: string]: DataProviderHistoricalResponse;
  }> {
    try {
      const historicalResult = this.convertToHistoricalResult(
        await this.yahooFinance.chart(
          this.yahooFinanceDataEnhancerService.convertToYahooFinanceSymbol(
            symbol
          ),
          {
            interval: '1d',
            period1: format(from, DATE_FORMAT),
            period2: format(
              isSameDay(from, to) ? addDays(to, 1) : to,
              DATE_FORMAT
            )
          },
          {
            fetchOptions: { signal: AbortSignal.timeout(requestTimeout) }
          }
        )
      );

      const response: {
        [date: string]: DataProviderHistoricalResponse;
      } = {};

      for (const historicalItem of historicalResult) {
        response[format(historicalItem.date, DATE_FORMAT)] = {
          marketPrice: historicalItem.close
        };
      }

      return response;
    } catch (error) {
      if (error?.message === YahooFinanceService.DELISTED_ERROR_MESSAGE) {
        throw new AssetProfileDelistedError(
          `No data found, ${symbol} (${this.getName()}) may be delisted`
        );
      } else {
        throw new Error(
          `Could not get historical market data for ${symbol} (${this.getName()}) from ${format(
            from,
            DATE_FORMAT
          )} to ${format(to, DATE_FORMAT)}: [${error?.name}] ${error?.message}`
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
  }: GetQuotesParams): Promise<{ [symbol: string]: DataProviderResponse }> {
    const response: { [symbol: string]: DataProviderResponse } = {};

    if (symbols.length <= 0) {
      return response;
    }

    const yahooFinanceSymbols = symbols.map((symbol) =>
      this.yahooFinanceDataEnhancerService.convertToYahooFinanceSymbol(symbol)
    );

    try {
      let quotes: Price[] | Quote[] = [];

      try {
        quotes = await this.yahooFinance.quote(yahooFinanceSymbols);
      } catch (error) {
        this.logger.error(error);

        this.logger.warn('Fallback to yahooFinance.quoteSummary()');

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
      this.logger.error(error);

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
          uniqBy(quotes, ({ symbol }) => {
            return symbol;
          }).map(({ symbol }) => {
            return symbol;
          })
        );
      } catch (error) {
        if (error?.result?.length > 0) {
          marketData = error.result;
        }
      }

      for (const {
        currency,
        longName,
        quoteType,
        shortName,
        symbol
      } of marketData) {
        const { assetClass, assetSubClass } =
          this.yahooFinanceDataEnhancerService.parseAssetClass({
            quoteType,
            shortName
          });

        items.push({
          assetClass,
          assetSubClass,
          currency,
          dataProviderInfo: this.getDataProviderInfo(),
          dataSource: this.getName(),
          name: this.yahooFinanceDataEnhancerService.formatName({
            longName,
            quoteType,
            shortName,
            symbol
          }),
          symbol:
            this.yahooFinanceDataEnhancerService.convertFromYahooFinanceSymbol(
              symbol
            )
        });
      }
    } catch (error) {
      if (error?.name === 'BadRequestError') {
        this.logger.warn(`Could not search for "${query}": ${error.message}`);
      } else {
        this.logger.error(error);
      }
    }

    return { items };
  }

  private convertToDividendResult(
    result: ChartResultArray
  ): HistoricalDividendsResult {
    return (result.events?.dividends ?? []).map(
      ({ amount: dividends, date }) => {
        return { date, dividends };
      }
    );
  }

  private convertToHistoricalResult(
    result: ChartResultArray
  ): HistoricalHistoryResult {
    return result.quotes;
  }

  private async getQuotesWithQuoteSummary(aYahooFinanceSymbols: string[]) {
    const quoteSummaryPromises = aYahooFinanceSymbols.map((symbol) => {
      return this.yahooFinance.quoteSummary(symbol);
    });

    const settledResults = await Promise.allSettled(quoteSummaryPromises);

    return settledResults
      .filter(
        (result): result is PromiseFulfilledResult<QuoteSummaryResult> => {
          if (result.status === 'rejected') {
            this.logger.error(`Could not get quote summary: ${result.reason}`);

            return false;
          }

          return true;
        }
      )
      .map(({ value }) => {
        return value.price;
      });
  }
}
