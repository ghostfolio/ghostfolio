import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { CurrentRateServiceMock } from '@ghostfolio/api/app/portfolio/current-rate.service.mock';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { ExchangeRateDataServiceMock } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service.mock';
import { parseDate } from '@ghostfolio/common/helper';

import { Big } from 'big.js';

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
    currentRateService = new CurrentRateService(null, null, null, null);

    exchangeRateDataService = new ExchangeRateDataService(
      null,
      null,
      null,
      null
    );
  });

  describe('get current positions', () => {
    it.only('with MSFT buy', async () => {
      const portfolioCalculator = new PortfolioCalculator({
        currentRateService,
        exchangeRateDataService,
        activities: <Activity[]>[
          {
            date: new Date('2021-09-16'),
            fee: 19,
            quantity: 1,
            SymbolProfile: {
              currency: 'USD',
              dataSource: 'YAHOO',
              name: 'Microsoft Inc.',
              symbol: 'MSFT'
            },
            type: 'BUY',
            unitPrice: 298.58
          },
          {
            date: new Date('2021-11-16'),
            fee: 0,
            quantity: 1,
            SymbolProfile: {
              currency: 'USD',
              dataSource: 'YAHOO',
              name: 'Microsoft Inc.',
              symbol: 'MSFT'
            },
            type: 'DIVIDEND',
            unitPrice: 0.62
          }
        ],
        currency: 'USD'
      });

      const spy = jest
        .spyOn(Date, 'now')
        .mockImplementation(() => parseDate('2023-07-10').getTime());

      const currentPositions = await portfolioCalculator.getCurrentPositions(
        parseDate('2023-07-10')
      );

      spy.mockRestore();

      expect(currentPositions).toMatchObject({
        errors: [],
        hasErrors: false,
        positions: [
          {
            averagePrice: new Big('298.58'),
            currency: 'USD',
            dataSource: 'YAHOO',
            dividend: new Big('0.62'),
            dividendInBaseCurrency: new Big('0.62'),
            fee: new Big('19'),
            firstBuyDate: '2021-09-16',
            investment: new Big('298.58'),
            investmentWithCurrencyEffect: new Big('298.58'),
            marketPrice: 331.83,
            marketPriceInBaseCurrency: 331.83,
            quantity: new Big('1'),
            symbol: 'MSFT',
            tags: undefined,
            transactionCount: 2
          }
        ],
        totalInvestment: new Big('298.58'),
        totalInvestmentWithCurrencyEffect: new Big('298.58')
      });
    });
  });
});
