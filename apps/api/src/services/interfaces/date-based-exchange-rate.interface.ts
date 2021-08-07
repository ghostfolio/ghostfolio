import Big from 'big.js';

export interface DateBasedExchangeRate {
  date: Date;
  exchangeRates: { [currency: string]: Big };
}
