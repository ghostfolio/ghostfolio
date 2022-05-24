import { PROPERTY_CURRENCIES } from '@ghostfolio/common/config';
import { DATE_FORMAT, getYesterday } from '@ghostfolio/common/helper';
import { Injectable, Logger } from '@nestjs/common';
import { format } from 'date-fns';
import { isNumber, uniq } from 'lodash';

import { ConfigurationService } from './configuration.service';
import { DataProviderService } from './data-provider/data-provider.service';
import { IDataGatheringItem } from './interfaces/interfaces';
import { PrismaService } from './prisma.service';
import { PropertyService } from './property/property.service';

@Injectable()
export class ExchangeRateDataService {
  private baseCurrency: string;
  private currencies: string[] = [];
  private currencyPairs: IDataGatheringItem[] = [];
  private exchangeRates: { [currencyPair: string]: number } = {};

  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly dataProviderService: DataProviderService,
    private readonly prismaService: PrismaService,
    private readonly propertyService: PropertyService
  ) {
    this.initialize();
  }

  public getCurrencies() {
    return this.currencies?.length > 0 ? this.currencies : [this.baseCurrency];
  }

  public getCurrencyPairs() {
    return this.currencyPairs;
  }

  public async initialize() {
    this.baseCurrency = this.configurationService.get('BASE_CURRENCY');
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

    if (Object.keys(result).length !== this.currencyPairs.length) {
      // Load currencies directly from data provider as a fallback
      // if historical data is not fully available
      const historicalData = await this.dataProviderService.getQuotes(
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
    if (aValue === 0) {
      return 0;
    }

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
    Logger.error(
      `No exchange rate has been found for ${aFromCurrency}${aToCurrency}`,
      'ExchangeRateDataService'
    );
    return aValue;
  }

  private async prepareCurrencies(): Promise<string[]> {
    let currencies: string[] = [];

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
    ).forEach((account) => {
      currencies.push(account.currency);
    });

    (
      await this.prismaService.settings.findMany({
        distinct: ['currency'],
        orderBy: [{ currency: 'asc' }],
        select: { currency: true },
        where: {
          currency: {
            not: null
          }
        }
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

    return uniq(currencies).filter(Boolean).sort();
  }

  private prepareCurrencyPairs(aCurrencies: string[]) {
    return aCurrencies
      .filter((currency) => {
        return currency !== this.baseCurrency;
      })
      .map((currency) => {
        return {
          currency1: this.baseCurrency,
          currency2: currency,
          dataSource: this.dataProviderService.getPrimaryDataSource(),
          symbol: `${this.baseCurrency}${currency}`
        };
      });
  }
}
