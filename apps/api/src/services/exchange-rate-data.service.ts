import { DATE_FORMAT, getYesterday } from '@ghostfolio/common/helper';
import { Injectable } from '@nestjs/common';
import { Currency } from '@prisma/client';
import { format } from 'date-fns';

import { DataProviderService } from './data-provider.service';

@Injectable()
export class ExchangeRateDataService {
  private currencies = {};
  private pairs: string[] = [];

  public constructor(private dataProviderService: DataProviderService) {
    this.initialize();
  }

  public async initialize() {
    this.pairs = [];

    this.addPairs(Currency.CHF, Currency.EUR);
    this.addPairs(Currency.CHF, Currency.GBP);
    this.addPairs(Currency.CHF, Currency.USD);
    this.addPairs(Currency.EUR, Currency.GBP);
    this.addPairs(Currency.EUR, Currency.USD);
    this.addPairs(Currency.GBP, Currency.USD);

    await this.loadCurrencies();
  }

  public async loadCurrencies() {
    const result = await this.dataProviderService.getHistorical(
      this.pairs,
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

    this.pairs.forEach((pair) => {
      const [currency1, currency2] = pair.match(/.{1,3}/g);
      const date = format(getYesterday(), DATE_FORMAT);

      this.currencies[pair] = resultExtended[pair]?.[date]?.marketPrice;

      if (!this.currencies[pair]) {
        // Not found, calculate indirectly via USD
        this.currencies[pair] =
          resultExtended[`${currency1}${Currency.USD}`]?.[date]?.marketPrice *
          resultExtended[`${Currency.USD}${currency2}`]?.[date]?.marketPrice;

        // Calculate the opposite direction
        this.currencies[`${currency2}${currency1}`] = 1 / this.currencies[pair];
      }
    });
  }

  public toCurrency(
    aValue: number,
    aFromCurrency: Currency,
    aToCurrency: Currency
  ) {
    if (isNaN(this.currencies[`${Currency.USD}${Currency.CHF}`])) {
      // Reinitialize if data is not loaded correctly
      this.initialize();
    }

    let factor = 1;

    if (aFromCurrency !== aToCurrency) {
      factor = this.currencies[`${aFromCurrency}${aToCurrency}`];
    }

    return factor * aValue;
  }

  private addPairs(aCurrency1: Currency, aCurrency2: Currency) {
    this.pairs.push(`${aCurrency1}${aCurrency2}`);
    this.pairs.push(`${aCurrency2}${aCurrency1}`);
  }
}
