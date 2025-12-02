export interface ExchangeRatesByCurrency {
  [currency: string]: {
    [dateString: string]: number;
  };
}
