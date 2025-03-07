import { Injectable } from '@nestjs/common';

const cryptocurrencies = require('../../assets/cryptocurrencies/cryptocurrencies.json');
const customCryptocurrencies = require('../../assets/cryptocurrencies/custom.json');

@Injectable()
export class CryptocurrencyService {
  private combinedCryptocurrencies: string[];

  public isCryptocurrency(aSymbol = '') {
    const cryptocurrencySymbol = aSymbol.includes('-')
      ? aSymbol.split('-')[0]
      : aSymbol;
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
