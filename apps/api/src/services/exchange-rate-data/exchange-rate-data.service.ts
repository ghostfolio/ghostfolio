import { LogPerformance } from '@ghostfolio/api/interceptors/performance-logging/performance-logging.interceptor';
import { DataProviderService } from '@ghostfolio/api/services/data-provider/data-provider.service';
import { DataGatheringItem } from '@ghostfolio/api/services/interfaces/interfaces';
import { MarketDataService } from '@ghostfolio/api/services/market-data/market-data.service';
import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import {
  DEFAULT_CURRENCY,
  DERIVED_CURRENCIES,
  PROPERTY_CURRENCIES
} from '@ghostfolio/common/config';
import {
  DATE_FORMAT,
  getYesterday,
  resetHours
} from '@ghostfolio/common/helper';

import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  eachDayOfInterval,
  format,
  isBefore,
  isToday,
  subDays
} from 'date-fns';
import { isNumber } from 'lodash';
import ms from 'ms';

import { ExchangeRatesByCurrency } from './interfaces/exchange-rate-data.interface';

@Injectable()
export class ExchangeRateDataService {
  private currencies: string[] = [];
  private currencyPairs: DataGatheringItem[] = [];
  private derivedCurrencyFactors: { [currencyPair: string]: number } = {};
  private exchangeRates: { [currencyPair: string]: number } = {};
  private exchangeRateCache = new Map<string, Float64Array>();
  private pendingLoads = new Map<string, Promise<Float64Array>>();

  public constructor(
    private readonly dataProviderService: DataProviderService,
    private readonly marketDataService: MarketDataService,
    private readonly prismaService: PrismaService,
    private readonly propertyService: PropertyService
  ) {}

  public getCurrencies() {
    return this.currencies?.length > 0 ? this.currencies : [DEFAULT_CURRENCY];
  }

  public getCurrencyPairs() {
    return this.currencyPairs;
  }

  @LogPerformance
  public async getExchangeRatesByCurrency({
    currencies,
    endDate = new Date(),
    startDate,
    targetCurrency
  }: {
    currencies: string[];
    endDate?: Date;
    startDate: Date;
    targetCurrency: string;
  }): Promise<ExchangeRatesByCurrency> {
    if (!startDate) {
      return {};
    }

    const exchangeRatesByCurrency: {
      [currency: string]: { [dateString: string]: number };
    } = {};

    for (const currency of currencies) {
      exchangeRatesByCurrency[`${currency}${targetCurrency}`] =
        await this.getExchangeRates({
          startDate,
          currencyFrom: currency,
          currencyTo: targetCurrency
        });

      const dateStrings = Object.keys(
        exchangeRatesByCurrency[`${currency}${targetCurrency}`]
      );
      const lastDateString = dateStrings.reduce((a, b) => {
        return a > b ? a : b;
      }, undefined);

      let previousExchangeRate =
        exchangeRatesByCurrency[`${currency}${targetCurrency}`]?.[
          lastDateString
        ] ?? 1;

      // Start from the most recent date and fill in missing exchange rates
      // using the latest available rate
      for (
        let date = endDate;
        !isBefore(date, startDate);
        date = subDays(resetHours(date), 1)
      ) {
        const dateString = format(date, DATE_FORMAT);

        // Check if the exchange rate for the current date is missing
        if (
          isNaN(
            exchangeRatesByCurrency[`${currency}${targetCurrency}`][dateString]
          )
        ) {
          // If missing, fill with the previous exchange rate
          exchangeRatesByCurrency[`${currency}${targetCurrency}`][dateString] =
            previousExchangeRate;

          if (currency === DEFAULT_CURRENCY && isBefore(date, new Date())) {
            Logger.error(
              `No exchange rate has been found for ${currency}${targetCurrency} at ${dateString}`,
              'ExchangeRateDataService'
            );
          }
        } else {
          // If available, update the previous exchange rate
          previousExchangeRate =
            exchangeRatesByCurrency[`${currency}${targetCurrency}`][dateString];
        }
      }
    }

    return exchangeRatesByCurrency;
  }

  public hasCurrencyPair(currency1: string, currency2: string) {
    return this.currencyPairs.some(({ symbol }) => {
      return (
        symbol === `${currency1}${currency2}` ||
        symbol === `${currency2}${currency1}`
      );
    });
  }

  public async initialize() {
    this.currencies = await this.prepareCurrencies();
    this.currencyPairs = [];
    this.derivedCurrencyFactors = {};
    this.exchangeRates = {};

    for (const { currency, factor, rootCurrency } of DERIVED_CURRENCIES) {
      this.derivedCurrencyFactors[`${currency}${rootCurrency}`] = 1 / factor;
      this.derivedCurrencyFactors[`${rootCurrency}${currency}`] = factor;
    }

    for (const {
      currency1,
      currency2,
      dataSource
    } of this.prepareCurrencyPairs(this.currencies)) {
      this.currencyPairs.push({
        dataSource,
        symbol: `${currency1}${currency2}`
      });
    }

    await this.loadCurrencies();
  }

  public async loadCurrencies() {
    const result = await this.dataProviderService.getHistorical(
      this.currencyPairs,
      'day',
      getYesterday(),
      getYesterday()
    );

    const quotes = await this.dataProviderService.getQuotes({
      items: this.currencyPairs.map(({ dataSource, symbol }) => {
        return { dataSource, symbol };
      }),
      requestTimeout: ms('30 seconds')
    });

    for (const symbol of Object.keys(quotes)) {
      if (isNumber(quotes[symbol].marketPrice)) {
        result[symbol] = {
          [format(getYesterday(), DATE_FORMAT)]: {
            marketPrice: quotes[symbol].marketPrice
          }
        };
      }
    }

    const resultExtended = result;

    for (const symbol of Object.keys(result)) {
      const [currency1, currency2] = symbol.match(/.{1,3}/g);
      const [date] = Object.keys(result[symbol]);

      // Calculate the opposite direction
      resultExtended[`${currency2}${currency1}`] = {
        [date]: {
          marketPrice: 1 / result[symbol][date].marketPrice
        }
      };
    }

    for (const symbol of Object.keys(resultExtended)) {
      const [currency1, currency2] = symbol.match(/.{1,3}/g);
      const date = format(getYesterday(), DATE_FORMAT);

      this.exchangeRates[symbol] = resultExtended[symbol]?.[date]?.marketPrice;

      if (!this.exchangeRates[symbol]) {
        // Not found, calculate indirectly via base currency
        this.exchangeRates[symbol] =
          resultExtended[`${currency1}${DEFAULT_CURRENCY}`]?.[date]
            ?.marketPrice *
          resultExtended[`${DEFAULT_CURRENCY}${currency2}`]?.[date]
            ?.marketPrice;

        // Calculate the opposite direction
        this.exchangeRates[`${currency2}${currency1}`] =
          1 / this.exchangeRates[symbol];
      }
    }
  }

  public toCurrency(
    aValue: number,
    aFromCurrency: string,
    aToCurrency: string
  ) {
    if (aValue === 0) {
      return 0;
    }

    let factor: number;

    if (aFromCurrency === aToCurrency) {
      factor = 1;
    } else {
      if (this.exchangeRates[`${aFromCurrency}${aToCurrency}`]) {
        factor = this.exchangeRates[`${aFromCurrency}${aToCurrency}`];
      } else {
        // Calculate indirectly via base currency
        const factor1 =
          this.exchangeRates[`${aFromCurrency}${DEFAULT_CURRENCY}`];
        const factor2 = this.exchangeRates[`${DEFAULT_CURRENCY}${aToCurrency}`];

        factor = factor1 * factor2;

        this.exchangeRates[`${aFromCurrency}${aToCurrency}`] = factor;
      }
    }

    if (isNumber(factor) && !isNaN(factor)) {
      return factor * aValue;
    }

    // Fallback with error, if currencies are not available
    Logger.error(
      `No exchange rate has been found for ${aFromCurrency}${aToCurrency}`,
      'ExchangeRateDataService'
    );

    return aValue;
  }

  public async toCurrencyAtDate(
    aValue: number,
    aFromCurrency: string,
    aToCurrency: string,
    aDate: Date
  ) {
    if (aValue === 0) {
      return 0;
    }

    if (isToday(aDate)) {
      return this.toCurrency(aValue, aFromCurrency, aToCurrency);
    }

    const derivedCurrencyFactor =
      this.derivedCurrencyFactors[`${aFromCurrency}${aToCurrency}`];
    let factor: number;

    if (aFromCurrency === aToCurrency) {
      factor = 1;
    } else if (derivedCurrencyFactor) {
      factor = derivedCurrencyFactor;
    } else {
      const marketPrice = await this.getRateFromCache(
        `${aFromCurrency}${aToCurrency}`,
        aDate
      );

      if (marketPrice !== undefined) {
        factor = marketPrice;
      } else {
        try {
          let baseFromPrice: number | undefined =
            aFromCurrency === DEFAULT_CURRENCY ? 1 : undefined;
          let baseToPrice: number | undefined =
            aToCurrency === DEFAULT_CURRENCY ? 1 : undefined;

          if (aFromCurrency !== DEFAULT_CURRENCY) {
            baseFromPrice = await this.getRateFromCache(
              `${DEFAULT_CURRENCY}${aFromCurrency}`,
              aDate
            );

            if (baseFromPrice === undefined) {
              const crossPrice = await this.getRateFromCache(
                `${aFromCurrency}${DEFAULT_CURRENCY}`,
                aDate
              );
              if (crossPrice !== undefined) {
                baseFromPrice = 1 / crossPrice;
              }
            }
          }

          if (aToCurrency !== DEFAULT_CURRENCY) {
            baseToPrice = await this.getRateFromCache(
              `${DEFAULT_CURRENCY}${aToCurrency}`,
              aDate
            );

            if (baseToPrice === undefined) {
              const crossPrice = await this.getRateFromCache(
                `${aToCurrency}${DEFAULT_CURRENCY}`,
                aDate
              );
              if (crossPrice !== undefined) {
                baseToPrice = 1 / crossPrice;
              }
            }
          }

          factor = (1 / baseFromPrice) * baseToPrice;
        } catch {}
      }
    }

    if (isNumber(factor) && !isNaN(factor)) {
      return factor * aValue;
    }

    Logger.error(
      `No exchange rate has been found for ${aFromCurrency}${aToCurrency} at ${format(
        aDate,
        DATE_FORMAT
      )}`,
      'ExchangeRateDataService'
    );

    return undefined;
  }

  @OnEvent('market-data.updated')
  public onMarketDataUpdated(event: { symbol: string }) {
    this.exchangeRateCache.delete(event.symbol);
    this.pendingLoads.delete(event.symbol);
  }

  private getDaysSinceEpoch(aDate: Date) {
    return Math.floor(aDate.getTime() / 86400000) + 25569;
  }

  private async loadCache(aSymbol: string): Promise<Float64Array> {
    const dataSource = this.dataProviderService.getDataSourceForExchangeRates();
    const marketData = await this.prismaService.marketData.findMany({
      where: { dataSource, symbol: aSymbol },
      orderBy: { date: 'asc' },
      select: { date: true, marketPrice: true }
    });

    const todayDays = this.getDaysSinceEpoch(new Date());
    const maxDataDays =
      marketData.length > 0
        ? this.getDaysSinceEpoch(marketData[marketData.length - 1].date)
        : 0;

    const array = new Float64Array(Math.max(todayDays, maxDataDays) + 1);

    if (marketData.length > 0) {
      let lastRate = marketData[0].marketPrice;
      let currentIndex = this.getDaysSinceEpoch(marketData[0].date);

      for (const data of marketData) {
        const dataIndex = this.getDaysSinceEpoch(data.date);
        while (currentIndex < dataIndex && currentIndex <= todayDays) {
          array[currentIndex++] = lastRate;
        }
        lastRate = data.marketPrice;
        array[dataIndex] = lastRate;
        currentIndex = dataIndex + 1;
      }

      while (currentIndex <= todayDays) {
        array[currentIndex++] = lastRate;
      }
    }

    return array;
  }

  private async getRateFromCache(
    aSymbol: string,
    aDate: Date
  ): Promise<number | undefined> {
    let cache = this.exchangeRateCache.get(aSymbol);

    while (!cache) {
      if (this.pendingLoads.has(aSymbol)) {
        await this.pendingLoads.get(aSymbol);
        cache = this.exchangeRateCache.get(aSymbol);
      } else {
        cache = await this.loadAndCommit(aSymbol);
      }
    }

    const days = Math.min(this.getDaysSinceEpoch(aDate), cache.length - 1);

    if (days >= 0) {
      const rate = cache[days];
      return rate === 0 ? undefined : rate;
    }

    return undefined;
  }

  private async loadAndCommit(aSymbol: string): Promise<Float64Array> {
    const loadPromise = this.loadCache(aSymbol);
    this.pendingLoads.set(aSymbol, loadPromise);

    try {
      const cache = await loadPromise;

      if (this.pendingLoads.get(aSymbol) === loadPromise) {
        this.exchangeRateCache.set(aSymbol, cache);
      }

      return this.exchangeRateCache.get(aSymbol) ?? cache;
    } finally {
      if (this.pendingLoads.get(aSymbol) === loadPromise) {
        this.pendingLoads.delete(aSymbol);
      }
    }
  }

  private async getExchangeRates({
    currencyFrom,
    currencyTo,
    endDate = new Date(),
    startDate
  }: {
    currencyFrom: string;
    currencyTo: string;
    endDate?: Date;
    startDate: Date;
  }) {
    const dates = eachDayOfInterval({ end: endDate, start: startDate });
    const factors: { [dateString: string]: number } = {};

    if (currencyFrom === currencyTo) {
      for (const date of dates) {
        factors[format(date, DATE_FORMAT)] = 1;
      }

      return factors;
    }

    const derivedCurrencyFactor =
      this.derivedCurrencyFactors[`${currencyFrom}${currencyTo}`];

    if (derivedCurrencyFactor) {
      for (const date of dates) {
        factors[format(date, DATE_FORMAT)] = derivedCurrencyFactor;
      }

      return factors;
    }

    const dataSource = this.dataProviderService.getDataSourceForExchangeRates();
    const symbol = `${currencyFrom}${currencyTo}`;

    const marketData = await this.marketDataService.getRange({
      assetProfileIdentifiers: [
        {
          dataSource,
          symbol
        }
      ],
      dateQuery: { gte: startDate, lt: endDate }
    });

    if (marketData?.length > 0) {
      for (const { date, marketPrice } of marketData) {
        factors[format(date, DATE_FORMAT)] = marketPrice;
      }
    } else {
      // Calculate indirectly via base currency

      const marketPriceBaseCurrencyFromCurrency: {
        [dateString: string]: number;
      } = {};
      const marketPriceBaseCurrencyToCurrency: {
        [dateString: string]: number;
      } = {};

      try {
        if (currencyFrom === DEFAULT_CURRENCY) {
          for (const date of dates) {
            marketPriceBaseCurrencyFromCurrency[format(date, DATE_FORMAT)] = 1;
          }
        } else {
          const marketData = await this.marketDataService.getRange({
            assetProfileIdentifiers: [
              {
                dataSource,
                symbol: `${DEFAULT_CURRENCY}${currencyFrom}`
              }
            ],
            dateQuery: { gte: startDate, lt: endDate }
          });

          for (const { date, marketPrice } of marketData) {
            marketPriceBaseCurrencyFromCurrency[format(date, DATE_FORMAT)] =
              marketPrice;
          }
        }
      } catch {}

      try {
        if (currencyTo === DEFAULT_CURRENCY) {
          for (const date of dates) {
            marketPriceBaseCurrencyToCurrency[format(date, DATE_FORMAT)] = 1;
          }
        } else {
          const marketData = await this.marketDataService.getRange({
            assetProfileIdentifiers: [
              {
                dataSource,
                symbol: `${DEFAULT_CURRENCY}${currencyTo}`
              }
            ],
            dateQuery: {
              gte: startDate,
              lt: endDate
            }
          });

          for (const { date, marketPrice } of marketData) {
            marketPriceBaseCurrencyToCurrency[format(date, DATE_FORMAT)] =
              marketPrice;
          }
        }
      } catch {}

      for (const date of dates) {
        try {
          const factor =
            (1 /
              marketPriceBaseCurrencyFromCurrency[format(date, DATE_FORMAT)]) *
            marketPriceBaseCurrencyToCurrency[format(date, DATE_FORMAT)];

          if (isNaN(factor)) {
            throw new Error('Exchange rate is not a number');
          } else {
            factors[format(date, DATE_FORMAT)] = factor;
          }
        } catch {
          let errorMessage = `No exchange rate has been found for ${currencyFrom}${currencyTo} at ${format(
            date,
            DATE_FORMAT
          )}. Please complement market data for ${DEFAULT_CURRENCY}${currencyFrom}`;

          if (DEFAULT_CURRENCY !== currencyTo) {
            errorMessage = `${errorMessage} and ${DEFAULT_CURRENCY}${currencyTo}`;
          }

          Logger.error(`${errorMessage}.`, 'ExchangeRateDataService');
        }
      }
    }

    return factors;
  }

  private async prepareCurrencies(): Promise<string[]> {
    let currencies: string[] = [DEFAULT_CURRENCY];

    (
      await this.prismaService.account.findMany({
        distinct: ['currency'],
        orderBy: [{ currency: 'asc' }],
        select: { currency: true },
        where: {
          currency: {
            not: null
          }
        }
      })
    ).forEach(({ currency }) => {
      currencies.push(currency);
    });

    (
      await this.prismaService.symbolProfile.findMany({
        distinct: ['currency'],
        orderBy: [{ currency: 'asc' }],
        select: { currency: true }
      })
    ).forEach(({ currency }) => {
      currencies.push(currency);
    });

    const customCurrencies =
      await this.propertyService.getByKey<string[]>(PROPERTY_CURRENCIES);

    if (customCurrencies?.length > 0) {
      currencies = currencies.concat(customCurrencies);
    }

    // Add derived currencies
    currencies.push('USX');

    for (const { currency, rootCurrency } of DERIVED_CURRENCIES) {
      if (currencies.includes(currency) || currencies.includes(rootCurrency)) {
        currencies.push(currency);
        currencies.push(rootCurrency);
      }
    }

    return Array.from(new Set(currencies)).filter(Boolean).sort();
  }

  private prepareCurrencyPairs(aCurrencies: string[]) {
    return aCurrencies
      .filter((currency) => {
        return currency !== DEFAULT_CURRENCY;
      })
      .map((currency) => {
        return {
          currency1: DEFAULT_CURRENCY,
          currency2: currency,
          dataSource: this.dataProviderService.getDataSourceForExchangeRates(),
          symbol: `${DEFAULT_CURRENCY}${currency}`
        };
      });
  }
}
