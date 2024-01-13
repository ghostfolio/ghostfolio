import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { ExchangeRateDataServiceMock } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service.mock';
import { parseDate } from '@ghostfolio/common/helper';
import Big from 'big.js';

import { CurrentRateServiceMock } from './current-rate.service.mock';
import { PortfolioCalculator } from './portfolio-calculator';

jest.mock('@ghostfolio/api/app/portfolio/current-rate.service', () => {
  return {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    CurrentRateService: jest.fn().mockImplementation(() => {
      return CurrentRateServiceMock;
    })
  };
});

jest.mock(
  '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service',
  () => {
    return {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      ExchangeRateDataService: jest.fn().mockImplementation(() => {
        return ExchangeRateDataServiceMock;
      })
    };
  }
);

describe('PortfolioCalculator', () => {
  let currentRateService: CurrentRateService;
  let exchangeRateDataService: ExchangeRateDataService;

  beforeEach(() => {
    currentRateService = new CurrentRateService(null, null);

    exchangeRateDataService = new ExchangeRateDataService(
      null,
      null,
      null,
      null
    );
  });

  describe('get current positions', () => {
    it.only('with GOOGL buy', async () => {
      const portfolioCalculator = new PortfolioCalculator({
        currentRateService,
        exchangeRateDataService,
        currency: 'CHF',
        orders: [
          {
            currency: 'USD',
            date: '2023-01-03',
            dataSource: 'YAHOO',
            fee: new Big(1),
            name: 'Alphabet Inc.',
            quantity: new Big(1),
            symbol: 'GOOGL',
            type: 'BUY',
            unitPrice: new Big(89.12)
          }
        ]
      });

      portfolioCalculator.computeTransactionPoints();

      const spy = jest
        .spyOn(Date, 'now')
        .mockImplementation(() => parseDate('2023-07-10').getTime());

      const currentPositions = await portfolioCalculator.getCurrentPositions(
        parseDate('2023-01-03')
      );

      const investments = portfolioCalculator.getInvestments();

      const investmentsByMonth =
        portfolioCalculator.getInvestmentsByGroup('month');

      spy.mockRestore();

      expect(currentPositions).toEqual({
        currentValue: new Big('103.10483'),
        errors: [],
        grossPerformance: new Big('27.33'),
        grossPerformancePercentage: new Big('0.3066651705565529623'),
        grossPerformancePercentageWithCurrencyEffect: new Big(
          '0.25235044599563974109'
        ),
        grossPerformanceWithCurrencyEffect: new Big('20.775774'),
        hasErrors: false,
        netPerformance: new Big('26.33'),
        netPerformancePercentage: new Big('0.29544434470377019749'),
        netPerformancePercentageWithCurrencyEffect: new Big(
          '0.24112962014285697628'
        ),
        netPerformanceWithCurrencyEffect: new Big('19.851974'),
        positions: [
          {
            averagePrice: new Big('89.12'),
            currency: 'USD',
            dataSource: 'YAHOO',
            fee: new Big('1'),
            firstBuyDate: '2023-01-03',
            grossPerformance: new Big('27.33'),
            grossPerformancePercentage: new Big('0.3066651705565529623'),
            grossPerformancePercentageWithCurrencyEffect: new Big(
              '0.25235044599563974109'
            ),
            grossPerformanceWithCurrencyEffect: new Big('20.775774'),
            investment: new Big('89.12'),
            investmentWithCurrencyEffect: new Big('82.329056'),
            netPerformance: new Big('26.33'),
            netPerformancePercentage: new Big('0.29544434470377019749'),
            netPerformancePercentageWithCurrencyEffect: new Big(
              '0.24112962014285697628'
            ),
            netPerformanceWithCurrencyEffect: new Big('19.851974'),
            marketPrice: 116.45,
            marketPriceInBaseCurrency: 103.10483,
            quantity: new Big('1'),
            symbol: 'GOOGL',
            tags: undefined,
            timeWeightedInvestment: new Big('89.12'),
            timeWeightedInvestmentWithCurrencyEffect: new Big('82.329056'),
            transactionCount: 1
          }
        ],
        totalInvestment: new Big('89.12'),
        totalInvestmentWithCurrencyEffect: new Big('82.329056')
      });

      expect(investments).toEqual([
        { date: '2023-01-03', investment: new Big('89.12') }
      ]);

      expect(investmentsByMonth).toEqual([
        { date: '2023-01-01', investment: new Big('89.12') }
      ]);
    });
  });
});
