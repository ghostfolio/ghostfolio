import { Injectable } from '@nestjs/common';
import { Currency } from '@prisma/client';
import { format } from 'date-fns';
import { getYesterday } from 'libs/helper/src';

import { DataProviderService } from './data-provider.service';

@Injectable()
export class ExchangeRateDataService {
  private currencies = {};
  private pairs: string[] = [];

  public constructor(private dataProviderService: DataProviderService) {
    this.initialize();
  }

  public async initialize() {
    this.addPairs(Currency.CHF, Currency.EUR);
    this.addPairs(Currency.CHF, Currency.GBP);
    this.addPairs(Currency.CHF, Currency.USD);
    this.addPairs(Currency.EUR, Currency.GBP);
    this.addPairs(Currency.EUR, Currency.USD);
    this.addPairs(Currency.GBP, Currency.USD);

    await this.loadCurrencies();
  }

  private addPairs(aCurrency1: Currency, aCurrency2: Currency) {
    this.pairs.push(`${aCurrency1}${aCurrency2}`);
    this.pairs.push(`${aCurrency2}${aCurrency1}`);
  }

  public async loadCurrencies() {
    const result = await this.dataProviderService.getHistorical(
      this.pairs,
      'day',
      getYesterday(),
      getYesterday()
    );

    this.pairs.forEach((pair) => {
      this.currencies[pair] =
        result[pair]?.[format(getYesterday(), 'yyyy-MM-dd')]?.marketPrice || 1;

      if (this.currencies[pair] === 1) {
        // Calculate the other direction
        const [currency1, currency2] = pair.match(/.{1,3}/g);

        this.currencies[pair] =
          1 /
          result[`${currency2}${currency1}`]?.[
            format(getYesterday(), 'yyyy-MM-dd')
          ]?.marketPrice;
      }
    });
  }

  public toCurrency(
    aValue: number,
    aFromCurrency: Currency,
    aToCurrency: Currency
  ) {
    let factor = 1;

    if (aFromCurrency !== aToCurrency) {
      factor = this.currencies[`${aFromCurrency}${aToCurrency}`];
    }

    return factor * aValue;
  }
}
