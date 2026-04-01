import { PropertyService } from '@ghostfolio/api/services/property/property.service';
import {
  DEFAULT_CURRENCY,
  PROPERTY_CUSTOM_CRYPTOCURRENCIES
} from '@ghostfolio/common/config';

import { Injectable, OnModuleInit } from '@nestjs/common';

const cryptocurrencies = require('../../assets/cryptocurrencies/cryptocurrencies.json');
const customCryptocurrencies = require('../../assets/cryptocurrencies/custom.json');

@Injectable()
export class CryptocurrencyService implements OnModuleInit {
  private combinedCryptocurrencies: string[];

  public constructor(private readonly propertyService: PropertyService) {}

  public async onModuleInit() {
    const customCryptocurrenciesFromDatabase =
      await this.propertyService.getByKey<Record<string, string>>(
        PROPERTY_CUSTOM_CRYPTOCURRENCIES
      );

    this.combinedCryptocurrencies = [
      ...Object.keys(cryptocurrencies),
      ...Object.keys(customCryptocurrencies),
      ...Object.keys(customCryptocurrenciesFromDatabase ?? {})
    ];
  }

  public isCryptocurrency(aSymbol = '') {
    const cryptocurrencySymbol = aSymbol.substring(0, aSymbol.length - 3);

    return (
      aSymbol.endsWith(DEFAULT_CURRENCY) &&
      this.combinedCryptocurrencies.includes(cryptocurrencySymbol)
    );
  }
}
