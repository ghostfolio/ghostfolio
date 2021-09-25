import { baseCurrency } from '@ghostfolio/common/config';
import { DATE_FORMAT, getYesterday } from '@ghostfolio/common/helper';
import { Injectable } from '@nestjs/common';
import { DataSource } from '@prisma/client';
import { format } from 'date-fns';
import { isEmpty, isNumber, uniq } from 'lodash';

import { DataProviderService } from './data-provider/data-provider.service';
import { IDataGatheringItem } from './interfaces/interfaces';
import { PrismaService } from './prisma.service';

@Injectable()
export class ExchangeRateDataService {
  private currencies: string[] = [];
  private currencyPairs: IDataGatheringItem[] = [];
  private exchangeRates: { [currencyPair: string]: number } = {};

  public constructor(
    private readonly dataProviderService: DataProviderService,
    private readonly prismaService: PrismaService
  ) {
    this.initialize();
  }

  public getCurrencies() {
    return this.currencies?.length > 0 ? this.currencies : [baseCurrency];
  }

  public getCurrencyPairs() {
    return this.currencyPairs;
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
      this.addCurrencyPairs({ currency1, currency2, dataSource });
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

    this.currencyPairs.forEach(({ symbol }) => {
      const [currency1, currency2] = symbol.match(/.{1,3}/g);
      const date = format(getYesterday(), DATE_FORMAT);

      this.exchangeRates[symbol] = resultExtended[symbol]?.[date]?.marketPrice;

      if (!this.exchangeRates[symbol]) {
        // Not found, calculate indirectly via USD
        this.exchangeRates[symbol] =
          resultExtended[`${currency1}${'USD'}`]?.[date]?.marketPrice *
          resultExtended[`${'USD'}${currency2}`]?.[date]?.marketPrice;

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
        // Calculate indirectly via USD
        const factor1 = this.exchangeRates[`${aFromCurrency}${'USD'}`];
        const factor2 = this.exchangeRates[`${'USD'}${aToCurrency}`];

        factor = factor1 * factor2;

        this.exchangeRates[`${aFromCurrency}${aToCurrency}`] = factor;
      }
    }

    if (isNumber(factor) && !isNaN(factor)) {
      return factor * aValue;
    }

    // Fallback with error, if currencies are not available
    console.error(
      `No exchange rate has been found for ${aFromCurrency}${aToCurrency}`
    );
    return aValue;
  }

  private addCurrencyPairs({
    currency1,
    currency2,
    dataSource
  }: {
    currency1: string;
    currency2: string;
    dataSource: DataSource;
  }) {
    this.currencyPairs.push({
      dataSource,
      symbol: `${currency1}${currency2}`
    });
    this.currencyPairs.push({
      dataSource,
      symbol: `${currency2}${currency1}`
    });
  }

  private async prepareCurrencies(): Promise<string[]> {
    const currencies: string[] = [];

    const settings = await this.prismaService.settings.findMany({
      distinct: ['currency'],
      orderBy: [{ currency: 'asc' }],
      select: { currency: true }
    });

    settings.forEach((settingsItem) => {
      if (settingsItem.currency) {
        currencies.push(settingsItem.currency);
      }
    });

    const symbolProfiles = await this.prismaService.symbolProfile.findMany({
      distinct: ['currency'],
      orderBy: [{ currency: 'asc' }],
      select: { currency: true }
    });

    symbolProfiles.forEach((symbolProfile) => {
      if (symbolProfile.currency) {
        currencies.push(symbolProfile.currency);
      }
    });

    return uniq(currencies).sort();
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
          dataSource: DataSource.YAHOO,
          symbol: `${baseCurrency}${currency}`
        };
      });
  }
}
