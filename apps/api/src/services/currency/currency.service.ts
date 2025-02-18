import { PrismaService } from '@ghostfolio/api/services/prisma/prisma.service';
import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import {
  DEFAULT_CURRENCY,
  DERIVED_CURRENCIES,
  PROPERTY_CURRENCIES
} from '@ghostfolio/common/config';

import { Injectable } from '@nestjs/common';
import { uniq } from 'lodash';

@Injectable()
export class CurrencyService {
  private currencies: string[] = [];

  public constructor(
    private readonly prismaService: PrismaService,
    private readonly propertyService: PropertyService
  ) {}

  public getCurrencies() {
    return this.currencies?.length > 0 ? this.currencies : [DEFAULT_CURRENCY];
  }

  public async initialize() {
    this.currencies = await this.prepareCurrencies();
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

    const customCurrencies = (await this.propertyService.getByKey(
      PROPERTY_CURRENCIES
    )) as string[];

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

    return uniq(currencies).filter(Boolean).sort();
  }
}
