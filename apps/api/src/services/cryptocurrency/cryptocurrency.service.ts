import { Injectable } from '@nestjs/common';

const cryptocurrencies = require('cryptocurrencies');

const customCryptocurrencies = require('./custom-cryptocurrencies.json');

@Injectable()
export class CryptocurrencyService {
  private combinedCryptocurrencies: string[];

  public constructor() {}

  public isCryptocurrency(aSymbol = '') {
    const cryptocurrencySymbol = aSymbol.substring(0, aSymbol.length - 3);
    return this.getCryptocurrencies().includes(cryptocurrencySymbol);
  }

  private getCryptocurrencies() {
    if (!this.combinedCryptocurrencies) {
      this.combinedCryptocurrencies = [
        ...cryptocurrencies.symbols(),
        ...Object.keys(customCryptocurrencies)
      ];
    }

    return this.combinedCryptocurrencies;
  }
}
