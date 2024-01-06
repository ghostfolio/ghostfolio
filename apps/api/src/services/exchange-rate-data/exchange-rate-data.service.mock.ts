export const ExchangeRateDataServiceMock = {
  getExchangeRatesByCurrency: ({
    currencies,
    endDate,
    startDate,
    targetCurrency
  }): Promise<any> => {
    return Promise.resolve({
      CHF: {
        '2023-01-03': 1,
        '2023-07-10': 1
      },
      USD: {
        '2023-01-03': 0.92285,
        '2023-07-10': 0.8889
      }
    });
  }
};
