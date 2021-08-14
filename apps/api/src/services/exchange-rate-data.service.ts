import { currencyPairs } from '@ghostfolio/common/config';
import { DATE_FORMAT, getYesterday } from '@ghostfolio/common/helper';
import { Injectable } from '@nestjs/common';
import { Currency } from '@prisma/client';
import { format } from 'date-fns';
import { isNumber } from 'lodash';

import { DataProviderService } from './data-provider/data-provider.service';

@Injectable()
export class ExchangeRateDataService {
  private currencyPairs: string[] = [];
  private exchangeRates: { [currencyPair: string]: number } = {};

  public constructor(private dataProviderService: DataProviderService) {
    this.initialize();
  }

  public async initialize() {
    this.currencyPairs = [];
    this.exchangeRates = {};

    for (const { currency1, currency2 } of currencyPairs) {
      this.addCurrencyPairs(currency1, currency2);
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

    this.currencyPairs.forEach((pair) => {
      const [currency1, currency2] = pair.match(/.{1,3}/g);
      const date = format(getYesterday(), DATE_FORMAT);

      this.exchangeRates[pair] = resultExtended[pair]?.[date]?.marketPrice;

      if (!this.exchangeRates[pair]) {
        // Not found, calculate indirectly via USD
        this.exchangeRates[pair] =
          resultExtended[`${currency1}${Currency.USD}`]?.[date]?.marketPrice *
          resultExtended[`${Currency.USD}${currency2}`]?.[date]?.marketPrice;

        // Calculate the opposite direction
        this.exchangeRates[`${currency2}${currency1}`] =
          1 / this.exchangeRates[pair];
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

  private addCurrencyPairs(aCurrency1: Currency, aCurrency2: Currency) {
    this.currencyPairs.push(`${aCurrency1}${aCurrency2}`);
    this.currencyPairs.push(`${aCurrency2}${aCurrency1}`);
  }
}
