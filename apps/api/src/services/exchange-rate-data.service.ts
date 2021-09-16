import { currencyPairs } from '@ghostfolio/common/config';
import { DATE_FORMAT, getYesterday } from '@ghostfolio/common/helper';
import { Injectable } from '@nestjs/common';
import { Currency, DataSource } from '@prisma/client';
import { format } from 'date-fns';
import { isEmpty, isNumber } from 'lodash';

import { DataProviderService } from './data-provider/data-provider.service';
import { IDataGatheringItem } from './interfaces/interfaces';

@Injectable()
export class ExchangeRateDataService {
  private currencyPairs: IDataGatheringItem[] = [];
  private exchangeRates: { [currencyPair: string]: number } = {};

  public constructor(private dataProviderService: DataProviderService) {
    this.initialize();
  }

  public async initialize() {
    this.currencyPairs = [];
    this.exchangeRates = {};

    for (const { currency1, currency2, dataSource } of currencyPairs) {
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
          resultExtended[`${currency1}${Currency.USD}`]?.[date]?.marketPrice *
          resultExtended[`${Currency.USD}${currency2}`]?.[date]?.marketPrice;

        // Calculate the opposite direction
        this.exchangeRates[`${currency2}${currency1}`] =
          1 / this.exchangeRates[symbol];
      }
    });
  }

  public toCurrency(
    aValue: number,
    aFromCurrency: Currency,
    aToCurrency: Currency
  ) {
    if (isNaN(this.exchangeRates[`${Currency.USD}${Currency.CHF}`])) {
      // Reinitialize if data is not loaded correctly
      this.initialize();
    }

    let factor = 1;

    if (aFromCurrency !== aToCurrency) {
      if (this.exchangeRates[`${aFromCurrency}${aToCurrency}`]) {
        factor = this.exchangeRates[`${aFromCurrency}${aToCurrency}`];
      } else {
        // Calculate indirectly via USD
        const factor1 = this.exchangeRates[`${aFromCurrency}${Currency.USD}`];
        const factor2 = this.exchangeRates[`${Currency.USD}${aToCurrency}`];

        factor = factor1 * factor2;

        this.exchangeRates[`${aFromCurrency}${aToCurrency}`] = factor;
      }
    }

    if (isNumber(factor)) {
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
    currency1: Currency;
    currency2: Currency;
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
}
