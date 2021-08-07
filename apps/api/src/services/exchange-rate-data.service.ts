import { DateQuery } from '@ghostfolio/api/app/portfolio/interfaces/date-query.interface';
import { DateBasedExchangeRate } from '@ghostfolio/api/services/interfaces/date-based-exchange-rate.interface';
import { MarketDataService } from '@ghostfolio/api/services/market-data.service';
import { PROPERTY_CURRENCIES, baseCurrency } from '@ghostfolio/common/config';
import { DATE_FORMAT, getYesterday } from '@ghostfolio/common/helper';
import { Injectable, Logger } from '@nestjs/common';
import Big from 'big.js';
import { format, isSameDay } from 'date-fns';
import { isEmpty, isNumber, uniq } from 'lodash';

import { DataProviderService } from './data-provider/data-provider.service';
import { IDataGatheringItem } from './interfaces/interfaces';
import { PrismaService } from './prisma.service';
import { PropertyService } from './property/property.service';

@Injectable()
export class ExchangeRateDataService {
  private currencies: string[] = [];
  private currencyPairs: IDataGatheringItem[] = [];
  private exchangeRates: { [currencyPair: string]: number } = {};

  public constructor(
    private readonly dataProviderService: DataProviderService,
    private readonly marketDataService: MarketDataService,
    private readonly prismaService: PrismaService,
    private readonly propertyService: PropertyService
  ) {
    this.initialize();
  }

  public getCurrencies() {
    return this.currencies?.length > 0 ? this.currencies : [baseCurrency];
  }

  public getCurrencyPairs() {
    return this.currencyPairs;
  }

  public async getExchangeRates({
    dateQuery,
    sourceCurrencies,
    destinationCurrency
  }: {
    dateQuery: DateQuery;
    sourceCurrencies: string[];
    destinationCurrency: string;
  }): Promise<DateBasedExchangeRate[]> {
    const symbols = [...sourceCurrencies, destinationCurrency]
      .map((currency) => `${baseCurrency}${currency}`)
      .filter((v, i, a) => a.indexOf(v) === i);
    const exchangeRates = await this.marketDataService.getRange({
      dateQuery,
      symbols
    });

    if (exchangeRates.length === 0) {
      return [];
    }
    const results: DateBasedExchangeRate[] = [];
    let currentDate = exchangeRates[0].date;
    let currentRates: { [symbol: string]: Big } = {};
    for (const exchangeRate of exchangeRates) {
      if (!isSameDay(currentDate, exchangeRate.date)) {
        results.push({
          date: currentDate,
          exchangeRates: this.getUserExchangeRates(
            currentRates,
            destinationCurrency,
            sourceCurrencies
          )
        });
        currentDate = exchangeRate.date;
        currentRates = {};
      }
      currentRates[exchangeRate.symbol] = new Big(exchangeRate.marketPrice);
    }
    results.push({
      date: currentDate,
      exchangeRates: this.getUserExchangeRates(
        currentRates,
        destinationCurrency,
        sourceCurrencies
      )
    });
    return results;
  }

  public async initialize() {
    this.currencies = await this.prepareCurrencies();
    this.currencyPairs = [];
    this.exchangeRates = {};

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

    if (isEmpty(result)) {
      // Load currencies directly from data provider as a fallback
      // if historical data is not yet available
      const historicalData = await this.dataProviderService.get(
        this.currencyPairs.map(({ dataSource, symbol }) => {
          return { dataSource, symbol };
        })
      );

      Object.keys(historicalData).forEach((key) => {
        result[key] = {
          [format(getYesterday(), DATE_FORMAT)]: {
            marketPrice: historicalData[key].marketPrice
          }
        };
      });
    }

    const resultExtended = result;

    Object.keys(result).forEach((pair) => {
      const [currency1, currency2] = pair.match(/.{1,3}/g);
      const [date] = Object.keys(result[pair]);

      // Calculate the opposite direction
      resultExtended[`${currency2}${currency1}`] = {
        [date]: {
          marketPrice: 1 / result[pair][date].marketPrice
        }
      };
    });

    Object.keys(resultExtended).forEach((symbol) => {
      const [currency1, currency2] = symbol.match(/.{1,3}/g);
      const date = format(getYesterday(), DATE_FORMAT);

      this.exchangeRates[symbol] = resultExtended[symbol]?.[date]?.marketPrice;

      if (!this.exchangeRates[symbol]) {
        // Not found, calculate indirectly via base currency
        this.exchangeRates[symbol] =
          resultExtended[`${currency1}${baseCurrency}`]?.[date]?.marketPrice *
          resultExtended[`${baseCurrency}${currency2}`]?.[date]?.marketPrice;

        // Calculate the opposite direction
        this.exchangeRates[`${currency2}${currency1}`] =
          1 / this.exchangeRates[symbol];
      }
    });
  }

  public toCurrency(
    aValue: number,
    aFromCurrency: string,
    aToCurrency: string
  ) {
    const hasNaN = Object.values(this.exchangeRates).some((exchangeRate) => {
      return isNaN(exchangeRate);
    });

    if (hasNaN) {
      // Reinitialize if data is not loaded correctly
      this.initialize();
    }

    let factor = 1;

    if (aFromCurrency !== aToCurrency) {
      if (this.exchangeRates[`${aFromCurrency}${aToCurrency}`]) {
        factor = this.exchangeRates[`${aFromCurrency}${aToCurrency}`];
      } else {
        // Calculate indirectly via base currency
        const factor1 = this.exchangeRates[`${aFromCurrency}${baseCurrency}`];
        const factor2 = this.exchangeRates[`${baseCurrency}${aToCurrency}`];

        factor = factor1 * factor2;

        this.exchangeRates[`${aFromCurrency}${aToCurrency}`] = factor;
      }
    }

    if (isNumber(factor) && !isNaN(factor)) {
      return factor * aValue;
    }

    // Fallback with error, if currencies are not available
    Logger.error(
      `No exchange rate has been found for ${aFromCurrency}${aToCurrency}`
    );
    return aValue;
  }

  private async prepareCurrencies(): Promise<string[]> {
    let currencies: string[] = [];

    (
      await this.prismaService.account.findMany({
        distinct: ['currency'],
        orderBy: [{ currency: 'asc' }],
        select: { currency: true }
      })
    ).forEach((account) => {
      currencies.push(account.currency);
    });

    (
      await this.prismaService.settings.findMany({
        distinct: ['currency'],
        orderBy: [{ currency: 'asc' }],
        select: { currency: true }
      })
    ).forEach((userSettings) => {
      currencies.push(userSettings.currency);
    });

    (
      await this.prismaService.symbolProfile.findMany({
        distinct: ['currency'],
        orderBy: [{ currency: 'asc' }],
        select: { currency: true }
      })
    ).forEach((symbolProfile) => {
      currencies.push(symbolProfile.currency);
    });

    const customCurrencies = (await this.propertyService.getByKey(
      PROPERTY_CURRENCIES
    )) as string[];

    if (customCurrencies?.length > 0) {
      currencies = currencies.concat(customCurrencies);
    }

    return uniq(currencies).sort();
  }

  private getUserExchangeRates(
    currentRates: { [symbol: string]: Big },
    destinationCurrency: string,
    sourceCurrencies: string[]
  ): { [currency: string]: Big } {
    const result: { [currency: string]: Big } = {};

    for (const sourceCurrency of sourceCurrencies) {
      let exchangeRate: Big;
      if (sourceCurrency === destinationCurrency) {
        exchangeRate = new Big(1);
      } else if (
        destinationCurrency === baseCurrency &&
        currentRates[`${destinationCurrency}${sourceCurrency}`]
      ) {
        exchangeRate = new Big(1).div(
          currentRates[`${destinationCurrency}${sourceCurrency}`]
        );
      } else if (
        sourceCurrency === baseCurrency &&
        currentRates[`${sourceCurrency}${destinationCurrency}`]
      ) {
        exchangeRate = currentRates[`${sourceCurrency}${destinationCurrency}`];
      } else if (
        currentRates[`${baseCurrency}${destinationCurrency}`] &&
        currentRates[`${baseCurrency}${sourceCurrency}`]
      ) {
        exchangeRate = currentRates[
          `${baseCurrency}${destinationCurrency}`
        ].div(currentRates[`${baseCurrency}${sourceCurrency}`]);
      }

      if (exchangeRate) {
        result[sourceCurrency] = exchangeRate;
      }
    }

    return result;
  }

  private prepareCurrencyPairs(aCurrencies: string[]) {
    return aCurrencies
      .filter((currency) => {
        return currency !== baseCurrency;
      })
      .map((currency) => {
        return {
          currency1: baseCurrency,
          currency2: currency,
          dataSource: this.dataProviderService.getPrimaryDataSource(),
          symbol: `${baseCurrency}${currency}`
        };
      });
  }
}
