import { Injectable } from '@nestjs/common';

const cryptocurrencies = require('../../assets/cryptocurrencies/cryptocurrencies.json');
const customCryptocurrencies = require('../../assets/cryptocurrencies/custom.json');

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
        ...Object.keys(cryptocurrencies),
        ...Object.keys(customCryptocurrencies)
      ];
    }

    return this.combinedCryptocurrencies;
  }
}
