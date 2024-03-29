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
    it.only('with BALN.SW buy and sell in two activities', async () => {
      const portfolioCalculator = new PortfolioCalculator({
        currentRateService,
        exchangeRateDataService,
        activities: <Activity[]>[
          {
            date: new Date('2021-11-22'),
            fee: 1.55,
            quantity: 2,
            SymbolProfile: {
              currency: 'CHF',
              dataSource: 'YAHOO',
              name: 'Bâloise Holding AG',
              symbol: 'BALN.SW'
            },
            type: 'BUY',
            unitPrice: 142.9
          },
          {
            date: new Date('2021-11-30'),
            fee: 1.65,
            quantity: 1,
            SymbolProfile: {
              currency: 'CHF',
              dataSource: 'YAHOO',
              name: 'Bâloise Holding AG',
              symbol: 'BALN.SW'
            },
            type: 'SELL',
            unitPrice: 136.6
          },
          {
            date: new Date('2021-11-30'),
            fee: 0,
            quantity: 1,
            SymbolProfile: {
              currency: 'CHF',
              dataSource: 'YAHOO',
              name: 'Bâloise Holding AG',
              symbol: 'BALN.SW'
            },
            type: 'SELL',
            unitPrice: 136.6
          }
        ],
        currency: 'CHF'
      });

      const spy = jest
        .spyOn(Date, 'now')
        .mockImplementation(() => parseDate('2021-12-18').getTime());

      const chartData = await portfolioCalculator.getChartData({
        start: parseDate('2021-11-22')
      });

      const currentPositions = await portfolioCalculator.getCurrentPositions(
        parseDate('2021-11-22')
      );

      const investments = portfolioCalculator.getInvestments();

      const investmentsByMonth = portfolioCalculator.getInvestmentsByGroup({
        data: chartData,
        groupBy: 'month'
      });

      spy.mockRestore();

      expect(currentPositions).toEqual({
        currentValueInBaseCurrency: new Big('0'),
        errors: [],
        grossPerformance: new Big('-12.6'),
        grossPerformancePercentage: new Big('-0.04408677396780965649'),
        grossPerformancePercentageWithCurrencyEffect: new Big(
          '-0.04408677396780965649'
        ),
        grossPerformanceWithCurrencyEffect: new Big('-12.6'),
        hasErrors: false,
        netPerformance: new Big('-15.8'),
        netPerformancePercentage: new Big('-0.05528341497550734703'),
        netPerformancePercentageWithCurrencyEffect: new Big(
          '-0.05528341497550734703'
        ),
        netPerformanceWithCurrencyEffect: new Big('-15.8'),
        positions: [
          {
            averagePrice: new Big('0'),
            currency: 'CHF',
            dataSource: 'YAHOO',
            dividend: new Big('0'),
            dividendInBaseCurrency: new Big('0'),
            fee: new Big('3.2'),
            firstBuyDate: '2021-11-22',
            grossPerformance: new Big('-12.6'),
            grossPerformancePercentage: new Big('-0.04408677396780965649'),
            grossPerformancePercentageWithCurrencyEffect: new Big(
              '-0.04408677396780965649'
            ),
            grossPerformanceWithCurrencyEffect: new Big('-12.6'),
            investment: new Big('0'),
            investmentWithCurrencyEffect: new Big('0'),
            netPerformance: new Big('-15.8'),
            netPerformancePercentage: new Big('-0.05528341497550734703'),
            netPerformancePercentageWithCurrencyEffect: new Big(
              '-0.05528341497550734703'
            ),
            netPerformanceWithCurrencyEffect: new Big('-15.8'),
            marketPrice: 148.9,
            marketPriceInBaseCurrency: 148.9,
            quantity: new Big('0'),
            symbol: 'BALN.SW',
            timeWeightedInvestment: new Big('285.80000000000000396627'),
            timeWeightedInvestmentWithCurrencyEffect: new Big(
              '285.80000000000000396627'
            ),
            transactionCount: 3,
            valueInBaseCurrency: new Big('0')
          }
        ],
        totalInvestment: new Big('0'),
        totalInvestmentWithCurrencyEffect: new Big('0')
      });

      expect(investments).toEqual([
        { date: '2021-11-22', investment: new Big('285.8') },
        { date: '2021-11-30', investment: new Big('0') }
      ]);

      expect(investmentsByMonth).toEqual([
        { date: '2021-11-01', investment: 0 },
        { date: '2021-12-01', investment: 0 }
      ]);
    });
  });
});
