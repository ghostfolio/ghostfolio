export const ExchangeRateDataServiceMock = {
  getExchangeRatesByCurrency: ({
    currencies,
    endDate,
    startDate,
    targetCurrency
  }): Promise<any> => {
    if (targetCurrency === 'CHF') {
      return Promise.resolve({
        CHFCHF: {
          '2015-01-01': 1,
          '2017-12-31': 1,
          '2018-01-01': 1,
          '2023-01-03': 1,
          '2023-07-10': 1
        },
        USDCHF: {
          '2015-01-01': 0.9941099999999999,
          '2017-12-31': 0.9787,
          '2018-01-01': 0.97373,
          '2023-01-03': 0.9238,
          '2023-07-10': 0.8854
        }
      });
    } else if (targetCurrency === 'USD') {
      return Promise.resolve({
        USDUSD: {
          '2018-01-01': 1,
          '2021-11-16': 1,
          '2023-07-10': 1
        }
      });
    }

    return Promise.resolve({});
  }
};
