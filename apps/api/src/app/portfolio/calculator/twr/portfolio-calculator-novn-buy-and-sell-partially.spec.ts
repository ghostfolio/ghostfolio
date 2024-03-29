import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { CurrentRateServiceMock } from '@ghostfolio/api/app/portfolio/current-rate.service.mock';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
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
    it.only('with NOVN.SW buy and sell partially', async () => {
      const portfolioCalculator = new PortfolioCalculator({
        currentRateService,
        exchangeRateDataService,
        activities: <Activity[]>[
          {
            date: new Date('2022-03-07'),
            fee: 1.3,
            quantity: 2,
            SymbolProfile: {
              currency: 'CHF',
              dataSource: 'YAHOO',
              name: 'Novartis AG',
              symbol: 'NOVN.SW'
            },
            type: 'BUY',
            unitPrice: 75.8
          },
          {
            date: new Date('2022-04-08'),
            fee: 2.95,
            quantity: 1,
            SymbolProfile: {
              currency: 'CHF',
              dataSource: 'YAHOO',
              name: 'Novartis AG',
              symbol: 'NOVN.SW'
            },
            type: 'SELL',
            unitPrice: 85.73
          }
        ],
        currency: 'CHF'
      });

      const spy = jest
        .spyOn(Date, 'now')
        .mockImplementation(() => parseDate('2022-04-11').getTime());

      const chartData = await portfolioCalculator.getChartData({
        start: parseDate('2022-03-07')
      });

      const currentPositions = await portfolioCalculator.getCurrentPositions(
        parseDate('2022-03-07')
      );

      const investments = portfolioCalculator.getInvestments();

      const investmentsByMonth = portfolioCalculator.getInvestmentsByGroup({
        data: chartData,
        groupBy: 'month'
      });

      spy.mockRestore();

      expect(currentPositions).toEqual({
        currentValueInBaseCurrency: new Big('87.8'),
        errors: [],
        grossPerformance: new Big('21.93'),
        grossPerformancePercentage: new Big('0.15113417083448194384'),
        grossPerformancePercentageWithCurrencyEffect: new Big(
          '0.15113417083448194384'
        ),
        grossPerformanceWithCurrencyEffect: new Big('21.93'),
        hasErrors: false,
        netPerformance: new Big('17.68'),
        netPerformancePercentage: new Big('0.12184460284330327256'),
        netPerformancePercentageWithCurrencyEffect: new Big(
          '0.12184460284330327256'
        ),
        netPerformanceWithCurrencyEffect: new Big('17.68'),
        positions: [
          {
            averagePrice: new Big('75.80'),
            currency: 'CHF',
            dataSource: 'YAHOO',
            dividend: new Big('0'),
            dividendInBaseCurrency: new Big('0'),
            fee: new Big('4.25'),
            firstBuyDate: '2022-03-07',
            grossPerformance: new Big('21.93'),
            grossPerformancePercentage: new Big('0.15113417083448194384'),
            grossPerformancePercentageWithCurrencyEffect: new Big(
              '0.15113417083448194384'
            ),
            grossPerformanceWithCurrencyEffect: new Big('21.93'),
            investment: new Big('75.80'),
            investmentWithCurrencyEffect: new Big('75.80'),
            netPerformance: new Big('17.68'),
            netPerformancePercentage: new Big('0.12184460284330327256'),
            netPerformancePercentageWithCurrencyEffect: new Big(
              '0.12184460284330327256'
            ),
            netPerformanceWithCurrencyEffect: new Big('17.68'),
            marketPrice: 87.8,
            marketPriceInBaseCurrency: 87.8,
            quantity: new Big('1'),
            symbol: 'NOVN.SW',
            timeWeightedInvestment: new Big('145.10285714285714285714'),
            timeWeightedInvestmentWithCurrencyEffect: new Big(
              '145.10285714285714285714'
            ),
            transactionCount: 2,
            valueInBaseCurrency: new Big('87.8')
          }
        ],
        totalInvestment: new Big('75.80'),
        totalInvestmentWithCurrencyEffect: new Big('75.80')
      });

      expect(investments).toEqual([
        { date: '2022-03-07', investment: new Big('151.6') },
        { date: '2022-04-08', investment: new Big('75.8') }
      ]);

      expect(investmentsByMonth).toEqual([
        { date: '2022-03-01', investment: 151.6 },
        { date: '2022-04-01', investment: -75.8 }
      ]);
    });
  });
});
