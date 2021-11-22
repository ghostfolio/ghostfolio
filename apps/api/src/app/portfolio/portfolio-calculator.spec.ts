import { OrderType } from '@ghostfolio/api/models/order-type';
import { parseDate, resetHours } from '@ghostfolio/common/helper';
import { DataSource } from '@prisma/client';
import Big from 'big.js';
import {
  addDays,
  differenceInCalendarDays,
  endOfDay,
  isBefore,
  isSameDay
} from 'date-fns';

import { CurrentRateService } from './current-rate.service';
import { GetValueParams } from './interfaces/get-value-params.interface';
import { GetValuesParams } from './interfaces/get-values-params.interface';
import { PortfolioOrder } from './interfaces/portfolio-order.interface';
import { TimelinePeriod } from './interfaces/timeline-period.interface';
import { TimelineSpecification } from './interfaces/timeline-specification.interface';
import { TransactionPoint } from './interfaces/transaction-point.interface';
import { PortfolioCalculator } from './portfolio-calculator';

function mockGetValue(symbol: string, date: Date) {
  switch (symbol) {
    case 'AMZN':
      return { marketPrice: 2021.99 };
    case 'MFA':
      if (isSameDay(parseDate('2010-12-31'), date)) {
        return { marketPrice: 1 };
      } else if (isSameDay(parseDate('2011-08-15'), date)) {
        return { marketPrice: 1.162484 }; // 1162484 / 1000000
      } else if (isSameDay(parseDate('2011-12-31'), date)) {
        return { marketPrice: 1.097884981 }; // 1192328 / 1086022.689344541
      }

      return { marketPrice: 0 };
    case 'SPA':
      if (isSameDay(parseDate('2013-12-31'), date)) {
        return { marketPrice: 1.025 }; // 205 / 200
      }

      return { marketPrice: 0 };
    case 'SPB':
      if (isSameDay(parseDate('2013-12-31'), date)) {
        return { marketPrice: 1.04 }; // 312 / 300
      }

      return { marketPrice: 0 };
    case 'TSLA':
      if (isSameDay(parseDate('2021-07-26'), date)) {
        return { marketPrice: 657.62 };
      } else if (isSameDay(parseDate('2021-01-02'), date)) {
        return { marketPrice: 666.66 };
      }

      return { marketPrice: 0 };
    case 'VTI':
      return {
        marketPrice: new Big('144.38')
          .plus(
            new Big('0.08').mul(
              differenceInCalendarDays(date, parseDate('2019-02-01'))
            )
          )
          .toNumber()
      };
    default:
      return { marketPrice: 0 };
  }
}

jest.mock('./current-rate.service', () => {
  return {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    CurrentRateService: jest.fn().mockImplementation(() => {
      return {
        getValue: ({
          currency,
          date,
          symbol,
          userCurrency
        }: GetValueParams) => {
          return Promise.resolve(mockGetValue(symbol, date));
        },
        getValues: ({
          currencies,
          dateQuery,
          dataGatheringItems,
          userCurrency
        }: GetValuesParams) => {
          const result = [];
          if (dateQuery.lt) {
            for (
              let date = resetHours(dateQuery.gte);
              isBefore(date, endOfDay(dateQuery.lt));
              date = addDays(date, 1)
            ) {
              for (const dataGatheringItem of dataGatheringItems) {
                result.push({
                  date,
                  marketPrice: mockGetValue(dataGatheringItem.symbol, date)
                    .marketPrice,
                  symbol: dataGatheringItem.symbol
                });
              }
            }
          } else {
            for (const date of dateQuery.in) {
              for (const dataGatheringItem of dataGatheringItems) {
                result.push({
                  date,
                  marketPrice: mockGetValue(dataGatheringItem.symbol, date)
                    .marketPrice,
                  symbol: dataGatheringItem.symbol
                });
              }
            }
          }
          return Promise.resolve(result);
        }
      };
    })
  };
});

describe('PortfolioCalculator', () => {
  let currentRateService: CurrentRateService;

  beforeEach(() => {
    currentRateService = new CurrentRateService(null, null, null);
  });

  describe('calculate transaction points', () => {
    it('with orders of only one symbol', () => {
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        'USD'
      );
      portfolioCalculator.computeTransactionPoints(ordersVTI);
      const portfolioItemsAtTransactionPoints =
        portfolioCalculator.getTransactionPoints();

      expect(portfolioItemsAtTransactionPoints).toEqual(
        ordersVTITransactionPoints
      );
    });

    it('with orders of only one symbol and a fee', () => {
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        'USD'
      );
      const orders: PortfolioOrder[] = [
        {
          date: '2019-02-01',
          name: 'Vanguard Total Stock Market Index Fund ETF Shares',
          quantity: new Big('10'),
          symbol: 'VTI',
          type: OrderType.Buy,
          unitPrice: new Big('144.38'),
          currency: 'USD',
          dataSource: DataSource.YAHOO,
          fee: new Big('5')
        },
        {
          date: '2019-08-03',
          name: 'Vanguard Total Stock Market Index Fund ETF Shares',
          quantity: new Big('10'),
          symbol: 'VTI',
          type: OrderType.Buy,
          unitPrice: new Big('147.99'),
          currency: 'USD',
          dataSource: DataSource.YAHOO,
          fee: new Big('10')
        },
        {
          date: '2020-02-02',
          name: 'Vanguard Total Stock Market Index Fund ETF Shares',
          quantity: new Big('15'),
          symbol: 'VTI',
          type: OrderType.Sell,
          unitPrice: new Big('151.41'),
          currency: 'USD',
          dataSource: DataSource.YAHOO,
          fee: new Big('5')
        }
      ];
      portfolioCalculator.computeTransactionPoints(orders);
      const portfolioItemsAtTransactionPoints =
        portfolioCalculator.getTransactionPoints();

      expect(portfolioItemsAtTransactionPoints).toEqual([
        {
          date: '2019-02-01',
          items: [
            {
              dataSource: DataSource.YAHOO,
              quantity: new Big('10'),
              symbol: 'VTI',
              investment: new Big('1443.8'),
              currency: 'USD',
              firstBuyDate: '2019-02-01',
              transactionCount: 1,
              fee: new Big('5')
            }
          ]
        },
        {
          date: '2019-08-03',
          items: [
            {
              dataSource: DataSource.YAHOO,
              quantity: new Big('20'),
              symbol: 'VTI',
              investment: new Big('2923.7'),
              currency: 'USD',
              firstBuyDate: '2019-02-01',
              transactionCount: 2,
              fee: new Big('15')
            }
          ]
        },
        {
          date: '2020-02-02',
          items: [
            {
              dataSource: DataSource.YAHOO,
              quantity: new Big('5'),
              symbol: 'VTI',
              investment: new Big('652.55'),
              currency: 'USD',
              firstBuyDate: '2019-02-01',
              transactionCount: 3,
              fee: new Big('20')
            }
          ]
        }
      ]);
    });

    it('with orders of two different symbols and a fee', () => {
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        'USD'
      );
      const orders: PortfolioOrder[] = [
        {
          date: '2019-02-01',
          name: 'Vanguard Total Stock Market Index Fund ETF Shares',
          quantity: new Big('10'),
          symbol: 'VTI',
          type: OrderType.Buy,
          unitPrice: new Big('144.38'),
          currency: 'USD',
          dataSource: DataSource.YAHOO,
          fee: new Big('5')
        },
        {
          date: '2019-08-03',
          name: 'Something else',
          quantity: new Big('10'),
          symbol: 'VTX',
          type: OrderType.Buy,
          unitPrice: new Big('147.99'),
          currency: 'USD',
          dataSource: DataSource.YAHOO,
          fee: new Big('10')
        },
        {
          date: '2020-02-02',
          name: 'Vanguard Total Stock Market Index Fund ETF Shares',
          quantity: new Big('5'),
          symbol: 'VTI',
          type: OrderType.Sell,
          unitPrice: new Big('151.41'),
          currency: 'USD',
          dataSource: DataSource.YAHOO,
          fee: new Big('5')
        }
      ];
      portfolioCalculator.computeTransactionPoints(orders);
      const portfolioItemsAtTransactionPoints =
        portfolioCalculator.getTransactionPoints();

      expect(portfolioItemsAtTransactionPoints).toEqual([
        {
          date: '2019-02-01',
          items: [
            {
              dataSource: DataSource.YAHOO,
              quantity: new Big('10'),
              symbol: 'VTI',
              investment: new Big('1443.8'),
              currency: 'USD',
              firstBuyDate: '2019-02-01',
              transactionCount: 1,
              fee: new Big('5')
            }
          ]
        },
        {
          date: '2019-08-03',
          items: [
            {
              dataSource: DataSource.YAHOO,
              quantity: new Big('10'),
              symbol: 'VTI',
              investment: new Big('1443.8'),
              currency: 'USD',
              firstBuyDate: '2019-02-01',
              transactionCount: 1,
              fee: new Big('5')
            },
            {
              dataSource: DataSource.YAHOO,
              quantity: new Big('10'),
              symbol: 'VTX',
              investment: new Big('1479.9'),
              currency: 'USD',
              firstBuyDate: '2019-08-03',
              transactionCount: 1,
              fee: new Big('10')
            }
          ]
        },
        {
          date: '2020-02-02',
          items: [
            {
              dataSource: DataSource.YAHOO,
              quantity: new Big('5'),
              symbol: 'VTI',
              investment: new Big('686.75'),
              currency: 'USD',
              firstBuyDate: '2019-02-01',
              transactionCount: 2,
              fee: new Big('10')
            },
            {
              dataSource: DataSource.YAHOO,
              quantity: new Big('10'),
              symbol: 'VTX',
              investment: new Big('1479.9'),
              currency: 'USD',
              firstBuyDate: '2019-08-03',
              transactionCount: 1,
              fee: new Big('10')
            }
          ]
        }
      ]);
    });

    it('with two orders at the same day of the same type', () => {
      const orders: PortfolioOrder[] = [
        ...ordersVTI,
        {
          currency: 'USD',
          dataSource: DataSource.YAHOO,
          date: '2021-02-01',
          name: 'Vanguard Total Stock Market Index Fund ETF Shares',
          quantity: new Big('20'),
          symbol: 'VTI',
          type: OrderType.Buy,
          unitPrice: new Big('197.15'),
          fee: new Big(0)
        }
      ];
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        'USD'
      );
      portfolioCalculator.computeTransactionPoints(orders);
      const portfolioItemsAtTransactionPoints =
        portfolioCalculator.getTransactionPoints();

      expect(portfolioItemsAtTransactionPoints).toEqual([
        {
          date: '2019-02-01',
          items: [
            {
              currency: 'USD',
              dataSource: DataSource.YAHOO,
              firstBuyDate: '2019-02-01',
              investment: new Big('1443.8'),
              quantity: new Big('10'),
              symbol: 'VTI',
              fee: new Big(0),
              transactionCount: 1
            }
          ]
        },
        {
          date: '2019-08-03',
          items: [
            {
              currency: 'USD',
              dataSource: DataSource.YAHOO,
              firstBuyDate: '2019-02-01',
              investment: new Big('2923.7'),
              quantity: new Big('20'),
              symbol: 'VTI',
              fee: new Big(0),
              transactionCount: 2
            }
          ]
        },
        {
          date: '2020-02-02',
          items: [
            {
              currency: 'USD',
              dataSource: DataSource.YAHOO,
              firstBuyDate: '2019-02-01',
              investment: new Big('652.55'),
              quantity: new Big('5'),
              symbol: 'VTI',
              fee: new Big(0),
              transactionCount: 3
            }
          ]
        },
        {
          date: '2021-02-01',
          items: [
            {
              currency: 'USD',
              dataSource: DataSource.YAHOO,
              firstBuyDate: '2019-02-01',
              investment: new Big('6627.05'),
              quantity: new Big('35'),
              symbol: 'VTI',
              fee: new Big(0),
              transactionCount: 5
            }
          ]
        },
        {
          date: '2021-08-01',
          items: [
            {
              currency: 'USD',
              dataSource: DataSource.YAHOO,
              firstBuyDate: '2019-02-01',
              investment: new Big('8403.95'),
              quantity: new Big('45'),
              symbol: 'VTI',
              fee: new Big(0),
              transactionCount: 6
            }
          ]
        }
      ]);
    });

    it('with additional order', () => {
      const orders: PortfolioOrder[] = [
        ...ordersVTI,
        {
          currency: 'USD',
          dataSource: DataSource.YAHOO,
          date: '2019-09-01',
          name: 'Amazon.com, Inc.',
          quantity: new Big('5'),
          symbol: 'AMZN',
          type: OrderType.Buy,
          unitPrice: new Big('2021.99'),
          fee: new Big(0)
        }
      ];
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        'USD'
      );
      portfolioCalculator.computeTransactionPoints(orders);
      const portfolioItemsAtTransactionPoints =
        portfolioCalculator.getTransactionPoints();

      expect(portfolioItemsAtTransactionPoints).toEqual([
        {
          date: '2019-02-01',
          items: [
            {
              dataSource: DataSource.YAHOO,
              quantity: new Big('10'),
              symbol: 'VTI',
              investment: new Big('1443.8'),
              currency: 'USD',
              firstBuyDate: '2019-02-01',
              fee: new Big(0),
              transactionCount: 1
            }
          ]
        },
        {
          date: '2019-08-03',
          items: [
            {
              dataSource: DataSource.YAHOO,
              quantity: new Big('20'),
              symbol: 'VTI',
              investment: new Big('2923.7'),
              currency: 'USD',
              firstBuyDate: '2019-02-01',
              fee: new Big(0),
              transactionCount: 2
            }
          ]
        },
        {
          date: '2019-09-01',
          items: [
            {
              dataSource: DataSource.YAHOO,
              quantity: new Big('5'),
              symbol: 'AMZN',
              investment: new Big('10109.95'),
              currency: 'USD',
              firstBuyDate: '2019-09-01',
              fee: new Big(0),
              transactionCount: 1
            },
            {
              dataSource: DataSource.YAHOO,
              quantity: new Big('20'),
              symbol: 'VTI',
              investment: new Big('2923.7'),
              currency: 'USD',
              firstBuyDate: '2019-02-01',
              fee: new Big(0),
              transactionCount: 2
            }
          ]
        },
        {
          date: '2020-02-02',
          items: [
            {
              dataSource: DataSource.YAHOO,
              quantity: new Big('5'),
              symbol: 'AMZN',
              investment: new Big('10109.95'),
              currency: 'USD',
              firstBuyDate: '2019-09-01',
              fee: new Big(0),
              transactionCount: 1
            },
            {
              dataSource: DataSource.YAHOO,
              quantity: new Big('5'),
              symbol: 'VTI',
              investment: new Big('652.55'),
              currency: 'USD',
              firstBuyDate: '2019-02-01',
              fee: new Big(0),
              transactionCount: 3
            }
          ]
        },
        {
          date: '2021-02-01',
          items: [
            {
              dataSource: DataSource.YAHOO,
              quantity: new Big('5'),
              symbol: 'AMZN',
              investment: new Big('10109.95'),
              currency: 'USD',
              firstBuyDate: '2019-09-01',
              fee: new Big(0),
              transactionCount: 1
            },
            {
              dataSource: DataSource.YAHOO,
              quantity: new Big('15'),
              symbol: 'VTI',
              investment: new Big('2684.05'),
              currency: 'USD',
              firstBuyDate: '2019-02-01',
              fee: new Big(0),
              transactionCount: 4
            }
          ]
        },
        {
          date: '2021-08-01',
          items: [
            {
              dataSource: DataSource.YAHOO,
              quantity: new Big('5'),
              symbol: 'AMZN',
              investment: new Big('10109.95'),
              currency: 'USD',
              firstBuyDate: '2019-09-01',
              fee: new Big(0),
              transactionCount: 1
            },
            {
              dataSource: DataSource.YAHOO,
              quantity: new Big('25'),
              symbol: 'VTI',
              investment: new Big('4460.95'),
              currency: 'USD',
              firstBuyDate: '2019-02-01',
              fee: new Big(0),
              transactionCount: 5
            }
          ]
        }
      ]);
    });

    it('with additional buy & sell', () => {
      const orders: PortfolioOrder[] = [
        ...ordersVTI,
        {
          date: '2019-09-01',
          name: 'Amazon.com, Inc.',
          quantity: new Big('5'),
          symbol: 'AMZN',
          type: OrderType.Buy,
          unitPrice: new Big('2021.99'),
          currency: 'USD',
          dataSource: DataSource.YAHOO,
          fee: new Big(0)
        },
        {
          date: '2020-08-02',
          name: 'Amazon.com, Inc.',
          quantity: new Big('5'),
          symbol: 'AMZN',
          type: OrderType.Sell,
          unitPrice: new Big('2412.23'),
          currency: 'USD',
          dataSource: DataSource.YAHOO,
          fee: new Big(0)
        }
      ];
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        'USD'
      );
      portfolioCalculator.computeTransactionPoints(orders);
      const portfolioItemsAtTransactionPoints =
        portfolioCalculator.getTransactionPoints();

      expect(portfolioItemsAtTransactionPoints).toEqual(
        transactionPointsBuyAndSell
      );
    });

    it('with mixed symbols', () => {
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        'USD'
      );
      portfolioCalculator.computeTransactionPoints(ordersMixedSymbols);
      const portfolioItemsAtTransactionPoints =
        portfolioCalculator.getTransactionPoints();

      expect(portfolioItemsAtTransactionPoints).toEqual([
        {
          date: '2017-01-03',
          items: [
            {
              dataSource: DataSource.YAHOO,
              quantity: new Big('50'),
              symbol: 'TSLA',
              investment: new Big('2148.5'),
              currency: 'USD',
              firstBuyDate: '2017-01-03',
              fee: new Big(0),
              transactionCount: 1
            }
          ]
        },
        {
          date: '2017-07-01',
          items: [
            {
              dataSource: DataSource.YAHOO,
              quantity: new Big('0.5614682'),
              symbol: 'BTCUSD',
              investment: new Big('1999.9999999999998659756'),
              currency: 'USD',
              firstBuyDate: '2017-07-01',
              fee: new Big(0),
              transactionCount: 1
            },
            {
              dataSource: DataSource.YAHOO,
              quantity: new Big('50'),
              symbol: 'TSLA',
              investment: new Big('2148.5'),
              currency: 'USD',
              firstBuyDate: '2017-01-03',
              fee: new Big(0),
              transactionCount: 1
            }
          ]
        },
        {
          date: '2018-09-01',
          items: [
            {
              dataSource: DataSource.YAHOO,
              quantity: new Big('5'),
              symbol: 'AMZN',
              investment: new Big('10109.95'),
              currency: 'USD',
              firstBuyDate: '2018-09-01',
              fee: new Big(0),
              transactionCount: 1
            },
            {
              dataSource: DataSource.YAHOO,
              quantity: new Big('0.5614682'),
              symbol: 'BTCUSD',
              investment: new Big('1999.9999999999998659756'),
              currency: 'USD',
              firstBuyDate: '2017-07-01',
              fee: new Big(0),
              transactionCount: 1
            },
            {
              dataSource: DataSource.YAHOO,
              quantity: new Big('50'),
              symbol: 'TSLA',
              investment: new Big('2148.5'),
              currency: 'USD',
              firstBuyDate: '2017-01-03',
              fee: new Big(0),
              transactionCount: 1
            }
          ]
        }
      ]);
    });
  });

  describe('get current positions', () => {
    it('with single TSLA and early start', async () => {
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        'USD'
      );
      portfolioCalculator.setTransactionPoints(orderTslaTransactionPoint);

      const spy = jest
        .spyOn(Date, 'now')
        .mockImplementation(() => new Date(Date.UTC(2021, 6, 26)).getTime()); // 2021-07-26
      const currentPositions = await portfolioCalculator.getCurrentPositions(
        parseDate('2020-01-21')
      );
      spy.mockRestore();

      expect(currentPositions).toEqual(
        expect.objectContaining({
          hasErrors: false,
          currentValue: new Big('657.62'),
          grossPerformance: new Big('-61.84'),
          grossPerformancePercentage: new Big('-0.08595335390431712673'),
          totalInvestment: new Big('719.46'),
          positions: [
            expect.objectContaining({
              averagePrice: new Big('719.46'),
              currency: 'USD',
              firstBuyDate: '2021-01-01',
              grossPerformance: new Big('-61.84'), // 657.62-719.46=-61.84
              grossPerformancePercentage: new Big('-0.08595335390431712673'), // (657.62-719.46)/719.46=-0.08595335390431712673
              investment: new Big('719.46'),
              marketPrice: 657.62,
              quantity: new Big('1'),
              symbol: 'TSLA',
              transactionCount: 1
            })
          ]
        })
      );
    });

    it('with single TSLA and buy day start', async () => {
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        'USD'
      );
      portfolioCalculator.setTransactionPoints(orderTslaTransactionPoint);

      const spy = jest
        .spyOn(Date, 'now')
        .mockImplementation(() => new Date(Date.UTC(2021, 6, 26)).getTime()); // 2021-07-26
      const currentPositions = await portfolioCalculator.getCurrentPositions(
        parseDate('2021-01-01')
      );
      spy.mockRestore();

      expect(currentPositions).toEqual(
        expect.objectContaining({
          hasErrors: false,
          currentValue: new Big('657.62'),
          grossPerformance: new Big('-61.84'),
          grossPerformancePercentage: new Big('-0.08595335390431712673'),
          totalInvestment: new Big('719.46'),
          positions: [
            expect.objectContaining({
              averagePrice: new Big('719.46'),
              currency: 'USD',
              firstBuyDate: '2021-01-01',
              grossPerformance: new Big('-61.84'), // 657.62-719.46=-61.84
              grossPerformancePercentage: new Big('-0.08595335390431712673'), // (657.62-719.46)/719.46=-0.08595335390431712673
              investment: new Big('719.46'),
              marketPrice: 657.62,
              quantity: new Big('1'),
              symbol: 'TSLA',
              transactionCount: 1
            })
          ]
        })
      );
    });

    it('with single TSLA and late start', async () => {
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        'USD'
      );
      portfolioCalculator.setTransactionPoints(orderTslaTransactionPoint);

      const spy = jest
        .spyOn(Date, 'now')
        .mockImplementation(() => new Date(Date.UTC(2021, 6, 26)).getTime()); // 2021-07-26
      const currentPositions = await portfolioCalculator.getCurrentPositions(
        parseDate('2021-01-02')
      );
      spy.mockRestore();

      expect(currentPositions).toEqual(
        expect.objectContaining({
          hasErrors: false,
          currentValue: new Big('657.62'),
          grossPerformance: new Big('-9.04'),
          grossPerformancePercentage: new Big('-0.01356013560135601356'),
          totalInvestment: new Big('719.46'),
          positions: [
            expect.objectContaining({
              averagePrice: new Big('719.46'),
              currency: 'USD',
              firstBuyDate: '2021-01-01',
              grossPerformance: new Big('-9.04'), // 657.62-666.66=-9.04
              grossPerformancePercentage: new Big('-0.01356013560135601356'), // 657.62/666.66-1=-0.013560136
              investment: new Big('719.46'),
              marketPrice: 657.62,
              quantity: new Big('1'),
              symbol: 'TSLA',
              transactionCount: 1
            })
          ]
        })
      );
    });

    it('with VTI only', async () => {
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        'USD'
      );
      portfolioCalculator.setTransactionPoints(ordersVTITransactionPoints);

      const spy = jest
        .spyOn(Date, 'now')
        .mockImplementation(() => new Date(Date.UTC(2020, 9, 24)).getTime()); // 2020-10-24
      const currentPositions = await portfolioCalculator.getCurrentPositions(
        parseDate('2019-01-01')
      );
      spy.mockRestore();

      expect(currentPositions).toEqual(
        expect.objectContaining({
          hasErrors: false,
          currentValue: new Big('4871.5'),
          grossPerformance: new Big('240.4'),
          grossPerformancePercentage: new Big('0.08839407904876477102'),
          totalInvestment: new Big('4460.95'),
          positions: [
            expect.objectContaining({
              averagePrice: new Big('178.438'),
              currency: 'USD',
              firstBuyDate: '2019-02-01',
              // see next test for details about how to calculate this
              grossPerformance: new Big('240.4'),
              grossPerformancePercentage: new Big(
                '0.0883940790487647710162214425767848424215253864940558186258745429269647266073266478435285352186572448'
              ),
              investment: new Big('4460.95'),
              marketPrice: 194.86,
              quantity: new Big('25'),
              symbol: 'VTI',
              transactionCount: 5
            })
          ]
        })
      );
    });

    it('with buy and sell', async () => {
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        'USD'
      );
      portfolioCalculator.setTransactionPoints(transactionPointsBuyAndSell);

      const spy = jest
        .spyOn(Date, 'now')
        .mockImplementation(() => new Date(Date.UTC(2020, 9, 24)).getTime()); // 2020-10-24
      const currentPositions = await portfolioCalculator.getCurrentPositions(
        parseDate('2019-01-01')
      );
      spy.mockRestore();

      expect(currentPositions).toEqual(
        expect.objectContaining({
          hasErrors: false,
          currentValue: new Big('4871.5'),
          grossPerformance: new Big('240.4'),
          grossPerformancePercentage: new Big('0.01104605615757711361'),
          totalInvestment: new Big('4460.95'),
          positions: [
            expect.objectContaining({
              averagePrice: new Big('0'),
              currency: 'USD',
              firstBuyDate: '2019-09-01',
              grossPerformance: new Big('0'),
              grossPerformancePercentage: new Big('0'),
              investment: new Big('0'),
              marketPrice: 2021.99,
              quantity: new Big('0'),
              symbol: 'AMZN',
              transactionCount: 2
            }),
            expect.objectContaining({
              averagePrice: new Big('178.438'),
              currency: 'USD',
              firstBuyDate: '2019-02-01',
              grossPerformance: new Big('240.4'),
              grossPerformancePercentage: new Big(
                '0.08839407904876477101219019935616297754969945667391763908415656216989674494965785538864363782688167989866968512455219637257546280462751601552'
              ),
              investment: new Big('4460.95'),
              marketPrice: 194.86,
              quantity: new Big('25'),
              symbol: 'VTI',
              transactionCount: 5
            })
          ]
        })
      );
    });

    it('with buy, sell, buy', async () => {
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        'USD'
      );
      portfolioCalculator.setTransactionPoints([
        {
          date: '2019-09-01',
          items: [
            {
              quantity: new Big('5'),
              symbol: 'VTI',
              investment: new Big('805.9'),
              currency: 'USD',
              dataSource: DataSource.YAHOO,
              firstBuyDate: '2019-09-01',
              fee: new Big(0),
              transactionCount: 1
            }
          ]
        },
        {
          date: '2020-08-02',
          items: [
            {
              quantity: new Big('0'),
              symbol: 'VTI',
              investment: new Big('0'),
              currency: 'USD',
              dataSource: DataSource.YAHOO,
              firstBuyDate: '2019-09-01',
              fee: new Big(0),
              transactionCount: 2
            }
          ]
        },
        {
          date: '2021-02-01',
          items: [
            {
              quantity: new Big('5'),
              symbol: 'VTI',
              investment: new Big('1013.9'),
              currency: 'USD',
              dataSource: DataSource.YAHOO,
              firstBuyDate: '2019-09-01',
              fee: new Big(0),
              transactionCount: 3
            }
          ]
        }
      ]);

      const spy = jest
        .spyOn(Date, 'now')
        .mockImplementation(() => new Date(Date.UTC(2021, 7, 1)).getTime()); // 2021-08-01
      const currentPositions = await portfolioCalculator.getCurrentPositions(
        parseDate('2019-02-01')
      );
      spy.mockRestore();

      expect(currentPositions).toEqual(
        expect.objectContaining({
          hasErrors: false,
          currentValue: new Big('1086.7'),
          grossPerformance: new Big('207.6'),
          grossPerformancePercentage: new Big('0.2516103956224511062'),
          totalInvestment: new Big('1013.9'),
          positions: [
            expect.objectContaining({
              averagePrice: new Big('202.78'),
              currency: 'USD',
              firstBuyDate: '2019-09-01',
              grossPerformance: new Big('207.6'),
              grossPerformancePercentage: new Big(
                '0.2516103956224511061954915466429950404846'
              ),
              investment: new Big('1013.9'),
              marketPrice: 217.34,
              quantity: new Big('5'),
              symbol: 'VTI',
              transactionCount: 3
            })
          ]
        })
      );
    });

    it('with performance since Jan 1st, 2020', async () => {
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        'USD'
      );
      const transactionPoints: TransactionPoint[] = [
        {
          date: '2019-02-01',
          items: [
            {
              quantity: new Big('10'),
              symbol: 'VTI',
              investment: new Big('1443.8'),
              currency: 'USD',
              dataSource: DataSource.YAHOO,
              firstBuyDate: '2019-02-01',
              fee: new Big(0),
              transactionCount: 1
            }
          ]
        },
        {
          date: '2020-08-03',
          items: [
            {
              quantity: new Big('20'),
              symbol: 'VTI',
              investment: new Big('2923.7'),
              currency: 'USD',
              dataSource: DataSource.YAHOO,
              firstBuyDate: '2019-02-01',
              fee: new Big(0),
              transactionCount: 2
            }
          ]
        }
      ];

      portfolioCalculator.setTransactionPoints(transactionPoints);
      const spy = jest
        .spyOn(Date, 'now')
        .mockImplementation(() => new Date(Date.UTC(2020, 9, 24)).getTime()); // 2020-10-24

      // 2020-01-01         -> days 334 => value: VTI: 144.38+334*0.08=171.1  => 10*171.10=1711
      // 2020-08-03         -> days 549 => value: VTI: 144.38+549*0.08=188.3  => 10*188.30=1883 => 1883/1711 = 1.100526008
      // 2020-08-03         -> days 549 => value: VTI: 144.38+549*0.08=188.3  => 20*188.30=3766
      // cash flow: 2923.7-1443.8=1479.9
      // 2020-10-24 [today] -> days 631 => value: VTI: 144.38+631*0.08=194.86 => 20*194.86=3897.2 => 3897.2/(1883+1479.9) = 1.158880728
      // gross performance: 1883-1711 + 3897.2-3766 = 303.2
      // gross performance percentage: 1.100526008 * 1.158880728 = 1.275378381 => 27.5378381 %

      const currentPositions = await portfolioCalculator.getCurrentPositions(
        parseDate('2020-01-01')
      );

      spy.mockRestore();
      expect(currentPositions).toEqual(
        expect.objectContaining({
          hasErrors: false,
          currentValue: new Big('3897.2'),
          grossPerformance: new Big('303.2'),
          grossPerformancePercentage: new Big('0.27537838148272398344'),
          totalInvestment: new Big('2923.7'),
          positions: [
            expect.objectContaining({
              averagePrice: new Big('146.185'),
              firstBuyDate: '2019-02-01',
              quantity: new Big('20'),
              symbol: 'VTI',
              investment: new Big('2923.7'),
              marketPrice: 194.86,
              transactionCount: 2,
              grossPerformance: new Big('303.2'),
              grossPerformancePercentage: new Big(
                '0.2753783814827239834392742298083677500037'
              ),
              currency: 'USD'
            })
          ]
        })
      );
    });

    it('with net performance since Jan 1st, 2020 - include fees', async () => {
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        'USD'
      );
      const transactionPoints: TransactionPoint[] = [
        {
          date: '2019-02-01',
          items: [
            {
              quantity: new Big('10'),
              symbol: 'VTI',
              investment: new Big('1443.8'),
              currency: 'USD',
              dataSource: DataSource.YAHOO,
              firstBuyDate: '2019-02-01',
              fee: new Big(50),
              transactionCount: 1
            }
          ]
        },
        {
          date: '2020-08-03',
          items: [
            {
              quantity: new Big('20'),
              symbol: 'VTI',
              investment: new Big('2923.7'),
              currency: 'USD',
              dataSource: DataSource.YAHOO,
              firstBuyDate: '2019-02-01',
              fee: new Big(100),
              transactionCount: 2
            }
          ]
        }
      ];

      portfolioCalculator.setTransactionPoints(transactionPoints);
      const spy = jest
        .spyOn(Date, 'now')
        .mockImplementation(() => new Date(Date.UTC(2020, 9, 24)).getTime()); // 2020-10-24

      // 2020-01-01         -> days 334 => value: VTI: 144.38+334*0.08=171.1  => 10*171.10=1711
      // 2020-08-03         -> days 549 => value: VTI: 144.38+549*0.08=188.3  => 10*188.30=1883 => 1883/1711 = 1.100526008
      // 2020-08-03         -> days 549 => value: VTI: 144.38+549*0.08=188.3  => 20*188.30=3766
      // cash flow: 2923.7-1443.8=1479.9
      // 2020-10-24 [today] -> days 631 => value: VTI: 144.38+631*0.08=194.86 => 20*194.86=3897.2 => 3897.2/(1883+1479.9) = 1.158880728
      //                                                                                    and net: 3897.2/(1883+1479.9+50) = 1.14190278
      // gross performance: 1883-1711 + 3897.2-3766 = 303.2
      // gross performance percentage: 1.100526008 * 1.158880728 = 1.275378381 => 27.5378381 %
      // net performance percentage:   1.100526008 * 1.14190278  = 1.25669371  => 25.669371 %

      // more details: https://github.com/ghostfolio/ghostfolio/issues/324#issuecomment-910530823

      const currentPositions = await portfolioCalculator.getCurrentPositions(
        parseDate('2020-01-01')
      );

      spy.mockRestore();
      expect(currentPositions).toEqual({
        hasErrors: false,
        currentValue: new Big('3897.2'),
        grossPerformance: new Big('303.2'),
        grossPerformancePercentage: new Big('0.27537838148272398344'),
        netAnnualizedPerformance: new Big('0.1412977563032074'),
        netPerformance: new Big('253.2'),
        netPerformancePercentage: new Big('0.2566937088951485493'),
        totalInvestment: new Big('2923.7'),
        positions: [
          {
            averagePrice: new Big('146.185'),
            dataSource: DataSource.YAHOO,
            firstBuyDate: '2019-02-01',
            quantity: new Big('20'),
            symbol: 'VTI',
            investment: new Big('2923.7'),
            marketPrice: 194.86,
            transactionCount: 2,
            grossPerformance: new Big('303.2'),
            grossPerformancePercentage: new Big(
              '0.2753783814827239834392742298083677500037'
            ),
            netPerformance: new Big('253.2'), // gross - 50 fees
            netPerformancePercentage: new Big(
              '0.2566937088951485493029975263687800261527'
            ), // see details above
            currency: 'USD'
          }
        ]
      });
    });

    it('with net performance since Feb 1st, 2019 - include fees', async () => {
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        'USD'
      );
      const transactionPoints: TransactionPoint[] = [
        {
          date: '2019-02-01',
          items: [
            {
              quantity: new Big('10'),
              symbol: 'VTI',
              investment: new Big('1443.8'),
              currency: 'USD',
              dataSource: DataSource.YAHOO,
              firstBuyDate: '2019-02-01',
              fee: new Big(50),
              transactionCount: 1
            }
          ]
        },
        {
          date: '2020-08-03',
          items: [
            {
              quantity: new Big('20'),
              symbol: 'VTI',
              investment: new Big('2923.7'),
              currency: 'USD',
              dataSource: DataSource.YAHOO,
              firstBuyDate: '2019-02-01',
              fee: new Big(100),
              transactionCount: 2
            }
          ]
        }
      ];

      portfolioCalculator.setTransactionPoints(transactionPoints);
      const spy = jest
        .spyOn(Date, 'now')
        .mockImplementation(() => new Date(Date.UTC(2020, 9, 24)).getTime()); // 2020-10-24

      // 2019-02-01         -> value: VTI: 1443.8
      // 2020-08-03         -> days 549 => value: VTI: 144.38+549*0.08=188.3  => 10*188.30=1883 => net: 1883/(1443.8+50) = 1.26054358
      // 2020-08-03         -> days 549 => value: VTI: 144.38+549*0.08=188.3  => 20*188.30=3766
      // cash flow: 2923.7-1443.8=1479.9
      // 2020-10-24 [today] -> days 631 => value: VTI: 144.38+631*0.08=194.86 => 20*194.86=3897.2 => net: 3897.2/(1883+1479.9+50) = 1.14190278
      // gross performance: 1883-1443.8 + 3897.2-3766 = 570.4 => net performance: 470.4
      // net performance percentage:   1.26054358 * 1.14190278  = 1.43941822  => 43.941822 %

      // more details: https://github.com/ghostfolio/ghostfolio/issues/324#issuecomment-910530823

      const currentPositions = await portfolioCalculator.getCurrentPositions(
        parseDate('2019-02-01')
      );

      spy.mockRestore();
      expect(currentPositions).toEqual(
        expect.objectContaining({
          hasErrors: false,
          currentValue: new Big('3897.2'),
          netPerformance: new Big('470.4'),
          netPerformancePercentage: new Big('0.4394182192526437059'),
          totalInvestment: new Big('2923.7'),
          positions: [
            expect.objectContaining({
              averagePrice: new Big('146.185'),
              firstBuyDate: '2019-02-01',
              quantity: new Big('20'),
              symbol: 'VTI',
              investment: new Big('2923.7'),
              marketPrice: 194.86,
              transactionCount: 2,
              netPerformance: new Big('470.4'),
              netPerformancePercentage: new Big(
                '0.4394182192526437058970248283134805555953'
              ), // see details above
              currency: 'USD'
            })
          ]
        })
      );
    });

    /**
     * Source: https://www.investopedia.com/terms/t/time-weightedror.asp
     */
    it('with TWR example from Investopedia: Scenario 1', async () => {
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        'USD'
      );
      portfolioCalculator.setTransactionPoints([
        {
          date: '2010-12-31',
          items: [
            {
              quantity: new Big('1000000'), // 1 million
              symbol: 'MFA', // Mutual Fund A
              investment: new Big('1000000'), // 1 million
              currency: 'USD',
              dataSource: DataSource.YAHOO,
              firstBuyDate: '2010-12-31',
              fee: new Big(0),
              transactionCount: 1
            }
          ]
        },
        {
          date: '2011-08-15',
          items: [
            {
              quantity: new Big('1086022.689344541'), // 1,000,000 + 100,000 / 1.162484
              symbol: 'MFA', // Mutual Fund A
              investment: new Big('1100000'), // 1,000,000 + 100,000
              currency: 'USD',
              dataSource: DataSource.YAHOO,
              firstBuyDate: '2010-12-31',
              fee: new Big(0),
              transactionCount: 2
            }
          ]
        }
      ]);

      const spy = jest
        .spyOn(Date, 'now')
        .mockImplementation(() => new Date(Date.UTC(2011, 11, 31)).getTime()); // 2011-12-31

      const currentPositions = await portfolioCalculator.getCurrentPositions(
        parseDate('2010-12-31')
      );
      spy.mockRestore();

      expect(currentPositions).toEqual(
        expect.objectContaining({
          hasErrors: false,
          currentValue: new Big('1192327.999656600298238721'),
          grossPerformance: new Big('92327.999656600898394721'),
          grossPerformancePercentage: new Big('0.09788498099999947809'),
          totalInvestment: new Big('1100000'),
          positions: [
            expect.objectContaining({
              averagePrice: new Big('1.01287018290924923237'), // 1'100'000 / 1'086'022.689344542
              firstBuyDate: '2010-12-31',
              quantity: new Big('1086022.689344541'),
              symbol: 'MFA',
              investment: new Big('1100000'),
              marketPrice: 1.097884981,
              transactionCount: 2,
              grossPerformance: new Big('92327.999656600898394721'), // 1'192'328 - 1'100'000 = 92'328
              grossPerformancePercentage: new Big(
                '0.09788498099999947808927632'
              ), // 9.79 %
              currency: 'USD'
            })
          ]
        })
      );
    });

    /**
     * Source: https://www.chsoft.ch/en/assets/Dateien/files/PDF/ePoca/en/Practical%20Performance%20Calculation.pdf
     */
    it('with example from chsoft.ch: Performance of a Combination of Investments', async () => {
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        'CHF'
      );
      portfolioCalculator.setTransactionPoints([
        {
          date: '2012-12-31',
          items: [
            {
              quantity: new Big('200'),
              symbol: 'SPA', // Sub Portfolio A
              investment: new Big('200'),
              currency: 'CHF',
              dataSource: DataSource.YAHOO,
              firstBuyDate: '2012-12-31',
              fee: new Big(0),
              transactionCount: 1
            },
            {
              quantity: new Big('300'),
              symbol: 'SPB', // Sub Portfolio B
              investment: new Big('300'),
              currency: 'CHF',
              dataSource: DataSource.YAHOO,
              firstBuyDate: '2012-12-31',
              fee: new Big(0),
              transactionCount: 1
            }
          ]
        },
        {
          date: '2013-12-31',
          items: [
            {
              quantity: new Big('200'),
              symbol: 'SPA', // Sub Portfolio A
              investment: new Big('200'),
              currency: 'CHF',
              dataSource: DataSource.YAHOO,
              firstBuyDate: '2012-12-31',
              fee: new Big(0),
              transactionCount: 1
            },
            {
              quantity: new Big('300'),
              symbol: 'SPB', // Sub Portfolio B
              investment: new Big('300'),
              currency: 'CHF',
              dataSource: DataSource.YAHOO,
              firstBuyDate: '2012-12-31',
              fee: new Big(0),
              transactionCount: 1
            }
          ]
        }
      ]);

      const spy = jest
        .spyOn(Date, 'now')
        .mockImplementation(() => new Date(Date.UTC(2013, 11, 31)).getTime()); // 2013-12-31

      const currentPositions = await portfolioCalculator.getCurrentPositions(
        parseDate('2012-12-31')
      );
      spy.mockRestore();

      expect(currentPositions).toEqual(
        expect.objectContaining({
          currentValue: new Big('517'),
          grossPerformance: new Big('17'), // 517 - 500
          grossPerformancePercentage: new Big('0.034'), // ((200 * 0.025) + (300 * 0.04)) / (200 + 300) = 3.4%
          totalInvestment: new Big('500'),
          hasErrors: false,
          positions: [
            expect.objectContaining({
              averagePrice: new Big('1'),
              firstBuyDate: '2012-12-31',
              quantity: new Big('200'),
              symbol: 'SPA',
              investment: new Big('200'),
              marketPrice: 1.025, // 205 / 200
              transactionCount: 1,
              grossPerformance: new Big('5'), // 205 - 200
              grossPerformancePercentage: new Big('0.025'),
              currency: 'CHF'
            }),
            expect.objectContaining({
              averagePrice: new Big('1'),
              firstBuyDate: '2012-12-31',
              quantity: new Big('300'),
              symbol: 'SPB',
              investment: new Big('300'),
              marketPrice: 1.04, // 312 / 300
              transactionCount: 1,
              grossPerformance: new Big('12'), // 312 - 300
              grossPerformancePercentage: new Big('0.04'),
              currency: 'CHF'
            })
          ]
        })
      );
    });
  });

  describe('calculate timeline', () => {
    it('with yearly', async () => {
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        'USD'
      );
      portfolioCalculator.setTransactionPoints(ordersVTITransactionPoints);
      const timelineSpecification: TimelineSpecification[] = [
        {
          start: '2019-01-01',
          accuracy: 'year'
        }
      ];
      const timelineInfo = await portfolioCalculator.calculateTimeline(
        timelineSpecification,
        '2021-06-30'
      );
      const timeline: TimelinePeriod[] = timelineInfo.timelinePeriods;

      expect(timeline).toEqual([
        {
          date: '2019-01-01',
          grossPerformance: new Big('0'),
          netPerformance: new Big('0'),
          investment: new Big('0'),
          value: new Big('0')
        },
        {
          date: '2020-01-01',
          grossPerformance: new Big('498.3'),
          netPerformance: new Big('498.3'),
          investment: new Big('2923.7'),
          value: new Big('3422') // 20 * (144.38 + days=335 * 0.08)
        },
        {
          date: '2021-01-01',
          grossPerformance: new Big('349.35'),
          netPerformance: new Big('349.35'),
          investment: new Big('652.55'),
          value: new Big('1001.9') // 5 * (144.38 + days=700 * 0.08)
        }
      ]);
    });

    it('with yearly and fees', async () => {
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        'USD'
      );
      const transactionPoints: TransactionPoint[] = [
        {
          date: '2019-02-01',
          items: [
            {
              quantity: new Big('10'),
              symbol: 'VTI',
              investment: new Big('1443.8'),
              currency: 'USD',
              dataSource: DataSource.YAHOO,
              firstBuyDate: '2019-02-01',
              fee: new Big(50),
              transactionCount: 1
            }
          ]
        },
        {
          date: '2019-08-03',
          items: [
            {
              quantity: new Big('20'),
              symbol: 'VTI',
              investment: new Big('2923.7'),
              currency: 'USD',
              dataSource: DataSource.YAHOO,
              firstBuyDate: '2019-02-01',
              fee: new Big(100),
              transactionCount: 2
            }
          ]
        },
        {
          date: '2020-02-02',
          items: [
            {
              quantity: new Big('5'),
              symbol: 'VTI',
              investment: new Big('652.55'),
              currency: 'USD',
              dataSource: DataSource.YAHOO,
              firstBuyDate: '2019-02-01',
              fee: new Big(150),
              transactionCount: 3
            }
          ]
        },
        {
          date: '2021-02-01',
          items: [
            {
              quantity: new Big('15'),
              symbol: 'VTI',
              investment: new Big('2684.05'),
              currency: 'USD',
              dataSource: DataSource.YAHOO,
              firstBuyDate: '2019-02-01',
              fee: new Big(200),
              transactionCount: 4
            }
          ]
        },
        {
          date: '2021-08-01',
          items: [
            {
              quantity: new Big('25'),
              symbol: 'VTI',
              investment: new Big('4460.95'),
              currency: 'USD',
              dataSource: DataSource.YAHOO,
              firstBuyDate: '2019-02-01',
              fee: new Big(250),
              transactionCount: 5
            }
          ]
        }
      ];
      portfolioCalculator.setTransactionPoints(transactionPoints);
      const timelineSpecification: TimelineSpecification[] = [
        {
          start: '2019-01-01',
          accuracy: 'year'
        }
      ];
      const timelineInfo = await portfolioCalculator.calculateTimeline(
        timelineSpecification,
        '2021-06-30'
      );
      const timeline: TimelinePeriod[] = timelineInfo.timelinePeriods;

      expect(timeline).toEqual([
        {
          date: '2019-01-01',
          grossPerformance: new Big('0'),
          netPerformance: new Big('0'),
          investment: new Big('0'),
          value: new Big('0')
        },
        {
          date: '2020-01-01',
          grossPerformance: new Big('498.3'),
          netPerformance: new Big('398.3'), // 100 fees
          investment: new Big('2923.7'),
          value: new Big('3422') // 20 * (144.38 + days=335 * 0.08)
        },
        {
          date: '2021-01-01',
          grossPerformance: new Big('349.35'),
          netPerformance: new Big('199.35'), // 150 fees
          investment: new Big('652.55'),
          value: new Big('1001.9') // 5 * (144.38 + days=700 * 0.08)
        }
      ]);
    });

    it('with monthly', async () => {
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        'USD'
      );
      portfolioCalculator.setTransactionPoints(ordersVTITransactionPoints);
      const timelineSpecification: TimelineSpecification[] = [
        {
          start: '2019-01-01',
          accuracy: 'month'
        }
      ];
      const timelineInfo = await portfolioCalculator.calculateTimeline(
        timelineSpecification,
        '2021-06-30'
      );
      const timeline: TimelinePeriod[] = timelineInfo.timelinePeriods;

      expect(timeline).toEqual([
        {
          date: '2019-01-01',
          grossPerformance: new Big('0'),
          netPerformance: new Big('0'),
          investment: new Big('0'),
          value: new Big('0')
        },
        {
          date: '2019-02-01',
          grossPerformance: new Big('0'),
          netPerformance: new Big('0'),
          investment: new Big('1443.8'),
          value: new Big('1443.8') // 10 * (144.38 + days=0 * 0.08)
        },
        {
          date: '2019-03-01',
          grossPerformance: new Big('22.4'),
          netPerformance: new Big('22.4'),
          investment: new Big('1443.8'),
          value: new Big('1466.2') // 10 * (144.38 + days=28 * 0.08)
        },
        {
          date: '2019-04-01',
          grossPerformance: new Big('47.2'),
          netPerformance: new Big('47.2'),
          investment: new Big('1443.8'),
          value: new Big('1491') // 10 * (144.38 + days=59 * 0.08)
        },
        {
          date: '2019-05-01',
          grossPerformance: new Big('71.2'),
          netPerformance: new Big('71.2'),
          investment: new Big('1443.8'),
          value: new Big('1515') // 10 * (144.38 + days=89 * 0.08)
        },
        {
          date: '2019-06-01',
          grossPerformance: new Big('96'),
          netPerformance: new Big('96'),
          investment: new Big('1443.8'),
          value: new Big('1539.8') // 10 * (144.38 + days=120 * 0.08)
        },
        {
          date: '2019-07-01',
          grossPerformance: new Big('120'),
          netPerformance: new Big('120'),
          investment: new Big('1443.8'),
          value: new Big('1563.8') // 10 * (144.38 + days=150 * 0.08)
        },
        {
          date: '2019-08-01',
          grossPerformance: new Big('144.8'),
          netPerformance: new Big('144.8'),
          investment: new Big('1443.8'),
          value: new Big('1588.6') // 10 * (144.38 + days=181 * 0.08)
        },
        {
          date: '2019-09-01',
          grossPerformance: new Big('303.1'),
          netPerformance: new Big('303.1'),
          investment: new Big('2923.7'),
          value: new Big('3226.8') // 20 * (144.38 + days=212 * 0.08)
        },
        {
          date: '2019-10-01',
          grossPerformance: new Big('351.1'),
          netPerformance: new Big('351.1'),
          investment: new Big('2923.7'),
          value: new Big('3274.8') // 20 * (144.38 + days=242 * 0.08)
        },
        {
          date: '2019-11-01',
          grossPerformance: new Big('400.7'),
          netPerformance: new Big('400.7'),
          investment: new Big('2923.7'),
          value: new Big('3324.4') // 20 * (144.38 + days=273 * 0.08)
        },
        {
          date: '2019-12-01',
          grossPerformance: new Big('448.7'),
          netPerformance: new Big('448.7'),
          investment: new Big('2923.7'),
          value: new Big('3372.4') // 20 * (144.38 + days=303 * 0.08)
        },
        {
          date: '2020-01-01',
          grossPerformance: new Big('498.3'),
          netPerformance: new Big('498.3'),
          investment: new Big('2923.7'),
          value: new Big('3422') // 20 * (144.38 + days=335 * 0.08)
        },
        {
          date: '2020-02-01',
          grossPerformance: new Big('547.9'),
          netPerformance: new Big('547.9'),
          investment: new Big('2923.7'),
          value: new Big('3471.6') // 20 * (144.38 + days=365 * 0.08)
        },
        {
          date: '2020-03-01',
          grossPerformance: new Big('226.95'),
          netPerformance: new Big('226.95'),
          investment: new Big('652.55'),
          value: new Big('879.5') // 5 * (144.38 + days=394 * 0.08)
        },
        {
          date: '2020-04-01',
          grossPerformance: new Big('239.35'),
          netPerformance: new Big('239.35'),
          investment: new Big('652.55'),
          value: new Big('891.9') // 5 * (144.38 + days=425 * 0.08)
        },
        {
          date: '2020-05-01',
          grossPerformance: new Big('251.35'),
          netPerformance: new Big('251.35'),
          investment: new Big('652.55'),
          value: new Big('903.9') // 5 * (144.38 + days=455 * 0.08)
        },
        {
          date: '2020-06-01',
          grossPerformance: new Big('263.75'),
          netPerformance: new Big('263.75'),
          investment: new Big('652.55'),
          value: new Big('916.3') // 5 * (144.38 + days=486 * 0.08)
        },
        {
          date: '2020-07-01',
          grossPerformance: new Big('275.75'),
          netPerformance: new Big('275.75'),
          investment: new Big('652.55'),
          value: new Big('928.3') // 5 * (144.38 + days=516 * 0.08)
        },
        {
          date: '2020-08-01',
          grossPerformance: new Big('288.15'),
          netPerformance: new Big('288.15'),
          investment: new Big('652.55'),
          value: new Big('940.7') // 5 * (144.38 + days=547 * 0.08)
        },
        {
          date: '2020-09-01',
          grossPerformance: new Big('300.55'),
          netPerformance: new Big('300.55'),
          investment: new Big('652.55'),
          value: new Big('953.1') // 5 * (144.38 + days=578 * 0.08)
        },
        {
          date: '2020-10-01',
          grossPerformance: new Big('312.55'),
          netPerformance: new Big('312.55'),
          investment: new Big('652.55'),
          value: new Big('965.1') // 5 * (144.38 + days=608 * 0.08)
        },
        {
          date: '2020-11-01',
          grossPerformance: new Big('324.95'),
          netPerformance: new Big('324.95'),
          investment: new Big('652.55'),
          value: new Big('977.5') // 5 * (144.38 + days=639 * 0.08)
        },
        {
          date: '2020-12-01',
          grossPerformance: new Big('336.95'),
          netPerformance: new Big('336.95'),
          investment: new Big('652.55'),
          value: new Big('989.5') // 5 * (144.38 + days=669 * 0.08)
        },
        {
          date: '2021-01-01',
          grossPerformance: new Big('349.35'),
          netPerformance: new Big('349.35'),
          investment: new Big('652.55'),
          value: new Big('1001.9') // 5 * (144.38 + days=700 * 0.08)
        },
        {
          date: '2021-02-01',
          grossPerformance: new Big('358.85'),
          netPerformance: new Big('358.85'),
          investment: new Big('2684.05'),
          value: new Big('3042.9') // 15 * (144.38 + days=731 * 0.08)
        },
        {
          date: '2021-03-01',
          grossPerformance: new Big('392.45'),
          netPerformance: new Big('392.45'),
          investment: new Big('2684.05'),
          value: new Big('3076.5') // 15 * (144.38 + days=759 * 0.08)
        },
        {
          date: '2021-04-01',
          grossPerformance: new Big('429.65'),
          netPerformance: new Big('429.65'),
          investment: new Big('2684.05'),
          value: new Big('3113.7') // 15 * (144.38 + days=790 * 0.08)
        },
        {
          date: '2021-05-01',
          grossPerformance: new Big('465.65'),
          netPerformance: new Big('465.65'),
          investment: new Big('2684.05'),
          value: new Big('3149.7') // 15 * (144.38 + days=820 * 0.08)
        },
        {
          date: '2021-06-01',
          grossPerformance: new Big('502.85'),
          netPerformance: new Big('502.85'),
          investment: new Big('2684.05'),
          value: new Big('3186.9') // 15 * (144.38 + days=851 * 0.08)
        }
      ]);

      expect(timelineInfo.maxNetPerformance).toEqual(new Big('547.9'));
      expect(timelineInfo.minNetPerformance).toEqual(new Big('0'));
    });

    it('with yearly and monthly mixed', async () => {
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        'USD'
      );
      portfolioCalculator.setTransactionPoints(ordersVTITransactionPoints);
      const timelineSpecification: TimelineSpecification[] = [
        {
          start: '2019-01-01',
          accuracy: 'year'
        },
        {
          start: '2021-01-01',
          accuracy: 'month'
        }
      ];
      const timelineInfo = await portfolioCalculator.calculateTimeline(
        timelineSpecification,
        '2021-06-30'
      );
      const timeline: TimelinePeriod[] = timelineInfo.timelinePeriods;

      expect(timeline).toEqual([
        {
          date: '2019-01-01',
          grossPerformance: new Big('0'),
          netPerformance: new Big('0'),
          investment: new Big('0'),
          value: new Big('0')
        },
        {
          date: '2020-01-01',
          grossPerformance: new Big('498.3'),
          netPerformance: new Big('498.3'),
          investment: new Big('2923.7'),
          value: new Big('3422') // 20 * (144.38 + days=335 * 0.08)
        },
        {
          date: '2021-01-01',
          grossPerformance: new Big('349.35'),
          netPerformance: new Big('349.35'),
          investment: new Big('652.55'),
          value: new Big('1001.9') // 5 * (144.38 + days=700 * 0.08)
        },
        {
          date: '2021-02-01',
          grossPerformance: new Big('358.85'),
          netPerformance: new Big('358.85'),
          investment: new Big('2684.05'),
          value: new Big('3042.9') // 15 * (144.38 + days=731 * 0.08)
        },
        {
          date: '2021-03-01',
          grossPerformance: new Big('392.45'),
          netPerformance: new Big('392.45'),
          investment: new Big('2684.05'),
          value: new Big('3076.5') // 15 * (144.38 + days=759 * 0.08)
        },
        {
          date: '2021-04-01',
          grossPerformance: new Big('429.65'),
          netPerformance: new Big('429.65'),
          investment: new Big('2684.05'),
          value: new Big('3113.7') // 15 * (144.38 + days=790 * 0.08)
        },
        {
          date: '2021-05-01',
          grossPerformance: new Big('465.65'),
          netPerformance: new Big('465.65'),
          investment: new Big('2684.05'),
          value: new Big('3149.7') // 15 * (144.38 + days=820 * 0.08)
        },
        {
          date: '2021-06-01',
          grossPerformance: new Big('502.85'),
          netPerformance: new Big('502.85'),
          investment: new Big('2684.05'),
          value: new Big('3186.9') // 15 * (144.38 + days=851 * 0.08)
        }
      ]);
    });

    it('with all mixed', async () => {
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        'USD'
      );
      portfolioCalculator.setTransactionPoints(ordersVTITransactionPoints);
      const timelineSpecification: TimelineSpecification[] = [
        {
          start: '2019-01-01',
          accuracy: 'year'
        },
        {
          start: '2021-01-01',
          accuracy: 'month'
        },
        {
          start: '2021-06-01',
          accuracy: 'day'
        }
      ];
      const timelineInfo = await portfolioCalculator.calculateTimeline(
        timelineSpecification,
        '2021-06-30'
      );
      const timeline: TimelinePeriod[] = timelineInfo.timelinePeriods;

      expect(timeline).toEqual(
        expect.objectContaining([
          {
            date: '2019-01-01',
            grossPerformance: new Big('0'),
            netPerformance: new Big('0'),
            investment: new Big('0'),
            value: new Big('0')
          },
          {
            date: '2020-01-01',
            grossPerformance: new Big('498.3'),
            netPerformance: new Big('498.3'),
            investment: new Big('2923.7'),
            value: new Big('3422') // 20 * (144.38 + days=335 * 0.08)
          },
          {
            date: '2021-01-01',
            grossPerformance: new Big('349.35'),
            netPerformance: new Big('349.35'),
            investment: new Big('652.55'),
            value: new Big('1001.9') // 5 * (144.38 + days=700 * 0.08)
          },
          {
            date: '2021-02-01',
            grossPerformance: new Big('358.85'),
            netPerformance: new Big('358.85'),
            investment: new Big('2684.05'),
            value: new Big('3042.9') // 15 * (144.38 + days=731 * 0.08)
          },
          {
            date: '2021-03-01',
            grossPerformance: new Big('392.45'),
            netPerformance: new Big('392.45'),
            investment: new Big('2684.05'),
            value: new Big('3076.5') // 15 * (144.38 + days=759 * 0.08)
          },
          {
            date: '2021-04-01',
            grossPerformance: new Big('429.65'),
            netPerformance: new Big('429.65'),
            investment: new Big('2684.05'),
            value: new Big('3113.7') // 15 * (144.38 + days=790 * 0.08)
          },
          {
            date: '2021-05-01',
            grossPerformance: new Big('465.65'),
            netPerformance: new Big('465.65'),
            investment: new Big('2684.05'),
            value: new Big('3149.7') // 15 * (144.38 + days=820 * 0.08)
          },
          {
            date: '2021-06-01',
            grossPerformance: new Big('502.85'),
            netPerformance: new Big('502.85'),
            investment: new Big('2684.05'),
            value: new Big('3186.9') // 15 * (144.38 + days=851 * 0.08)
          },
          {
            date: '2021-06-02',
            grossPerformance: new Big('504.05'),
            netPerformance: new Big('504.05'),
            investment: new Big('2684.05'),
            value: new Big('3188.1') // 15 * (144.38 + days=852 * 0.08) / +1.2
          },
          {
            date: '2021-06-03',
            grossPerformance: new Big('505.25'),
            netPerformance: new Big('505.25'),
            investment: new Big('2684.05'),
            value: new Big('3189.3') // +1.2
          },
          {
            date: '2021-06-04',
            grossPerformance: new Big('506.45'),
            netPerformance: new Big('506.45'),
            investment: new Big('2684.05'),
            value: new Big('3190.5') // +1.2
          },
          {
            date: '2021-06-05',
            grossPerformance: new Big('507.65'),
            netPerformance: new Big('507.65'),
            investment: new Big('2684.05'),
            value: new Big('3191.7') // +1.2
          },
          {
            date: '2021-06-06',
            grossPerformance: new Big('508.85'),
            netPerformance: new Big('508.85'),
            investment: new Big('2684.05'),
            value: new Big('3192.9') // +1.2
          },
          {
            date: '2021-06-07',
            grossPerformance: new Big('510.05'),
            netPerformance: new Big('510.05'),
            investment: new Big('2684.05'),
            value: new Big('3194.1') // +1.2
          },
          {
            date: '2021-06-08',
            grossPerformance: new Big('511.25'),
            netPerformance: new Big('511.25'),
            investment: new Big('2684.05'),
            value: new Big('3195.3') // +1.2
          },
          {
            date: '2021-06-09',
            grossPerformance: new Big('512.45'),
            netPerformance: new Big('512.45'),
            investment: new Big('2684.05'),
            value: new Big('3196.5') // +1.2
          },
          {
            date: '2021-06-10',
            grossPerformance: new Big('513.65'),
            netPerformance: new Big('513.65'),
            investment: new Big('2684.05'),
            value: new Big('3197.7') // +1.2
          },
          {
            date: '2021-06-11',
            grossPerformance: new Big('514.85'),
            netPerformance: new Big('514.85'),
            investment: new Big('2684.05'),
            value: new Big('3198.9') // +1.2
          },
          {
            date: '2021-06-12',
            grossPerformance: new Big('516.05'),
            netPerformance: new Big('516.05'),
            investment: new Big('2684.05'),
            value: new Big('3200.1') // +1.2
          },
          {
            date: '2021-06-13',
            grossPerformance: new Big('517.25'),
            netPerformance: new Big('517.25'),
            investment: new Big('2684.05'),
            value: new Big('3201.3') // +1.2
          },
          {
            date: '2021-06-14',
            grossPerformance: new Big('518.45'),
            netPerformance: new Big('518.45'),
            investment: new Big('2684.05'),
            value: new Big('3202.5') // +1.2
          },
          {
            date: '2021-06-15',
            grossPerformance: new Big('519.65'),
            netPerformance: new Big('519.65'),
            investment: new Big('2684.05'),
            value: new Big('3203.7') // +1.2
          },
          {
            date: '2021-06-16',
            grossPerformance: new Big('520.85'),
            netPerformance: new Big('520.85'),
            investment: new Big('2684.05'),
            value: new Big('3204.9') // +1.2
          },
          {
            date: '2021-06-17',
            grossPerformance: new Big('522.05'),
            netPerformance: new Big('522.05'),
            investment: new Big('2684.05'),
            value: new Big('3206.1') // +1.2
          },
          {
            date: '2021-06-18',
            grossPerformance: new Big('523.25'),
            netPerformance: new Big('523.25'),
            investment: new Big('2684.05'),
            value: new Big('3207.3') // +1.2
          },
          {
            date: '2021-06-19',
            grossPerformance: new Big('524.45'),
            netPerformance: new Big('524.45'),
            investment: new Big('2684.05'),
            value: new Big('3208.5') // +1.2
          },
          {
            date: '2021-06-20',
            grossPerformance: new Big('525.65'),
            netPerformance: new Big('525.65'),
            investment: new Big('2684.05'),
            value: new Big('3209.7') // +1.2
          },
          {
            date: '2021-06-21',
            grossPerformance: new Big('526.85'),
            netPerformance: new Big('526.85'),
            investment: new Big('2684.05'),
            value: new Big('3210.9') // +1.2
          },
          {
            date: '2021-06-22',
            grossPerformance: new Big('528.05'),
            netPerformance: new Big('528.05'),
            investment: new Big('2684.05'),
            value: new Big('3212.1') // +1.2
          },
          {
            date: '2021-06-23',
            grossPerformance: new Big('529.25'),
            netPerformance: new Big('529.25'),
            investment: new Big('2684.05'),
            value: new Big('3213.3') // +1.2
          },
          {
            date: '2021-06-24',
            grossPerformance: new Big('530.45'),
            netPerformance: new Big('530.45'),
            investment: new Big('2684.05'),
            value: new Big('3214.5') // +1.2
          },
          {
            date: '2021-06-25',
            grossPerformance: new Big('531.65'),
            netPerformance: new Big('531.65'),
            investment: new Big('2684.05'),
            value: new Big('3215.7') // +1.2
          },
          {
            date: '2021-06-26',
            grossPerformance: new Big('532.85'),
            netPerformance: new Big('532.85'),
            investment: new Big('2684.05'),
            value: new Big('3216.9') // +1.2
          },
          {
            date: '2021-06-27',
            grossPerformance: new Big('534.05'),
            netPerformance: new Big('534.05'),
            investment: new Big('2684.05'),
            value: new Big('3218.1') // +1.2
          },
          {
            date: '2021-06-28',
            grossPerformance: new Big('535.25'),
            netPerformance: new Big('535.25'),
            investment: new Big('2684.05'),
            value: new Big('3219.3') // +1.2
          },
          {
            date: '2021-06-29',
            grossPerformance: new Big('536.45'),
            netPerformance: new Big('536.45'),
            investment: new Big('2684.05'),
            value: new Big('3220.5') // +1.2
          },
          {
            date: '2021-06-30',
            grossPerformance: new Big('537.65'),
            netPerformance: new Big('537.65'),
            investment: new Big('2684.05'),
            value: new Big('3221.7') // +1.2
          }
        ])
      );
    });

    it('with mixed portfolio', async () => {
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        'USD'
      );
      portfolioCalculator.setTransactionPoints([
        {
          date: '2019-02-01',
          items: [
            {
              quantity: new Big('5'),
              symbol: 'AMZN',
              investment: new Big('10109.95'),
              currency: 'USD',
              dataSource: DataSource.YAHOO,
              firstBuyDate: '2019-02-01',
              fee: new Big(0),
              transactionCount: 1
            },
            {
              quantity: new Big('10'),
              symbol: 'VTI',
              investment: new Big('1443.8'),
              currency: 'USD',
              dataSource: DataSource.YAHOO,
              firstBuyDate: '2019-02-01',
              fee: new Big(0),
              transactionCount: 1
            }
          ]
        }
      ]);
      const timelineSpecification: TimelineSpecification[] = [
        {
          start: '2019-01-01',
          accuracy: 'year'
        }
      ];
      const timelineInfo = await portfolioCalculator.calculateTimeline(
        timelineSpecification,
        '2020-01-01'
      );
      const timeline: TimelinePeriod[] = timelineInfo.timelinePeriods;

      expect(timeline).toEqual([
        {
          date: '2019-01-01',
          grossPerformance: new Big('0'),
          netPerformance: new Big('0'),
          investment: new Big('0'),
          value: new Big('0')
        },
        {
          date: '2020-01-01',
          grossPerformance: new Big('267.2'),
          netPerformance: new Big('267.2'),
          investment: new Big('11553.75'),
          value: new Big('11820.95') // 10 * (144.38 + days=334 * 0.08) + 5 * 2021.99
        }
      ]);
    });
  });

  describe('annualized performance percentage', () => {
    const portfolioCalculator = new PortfolioCalculator(
      currentRateService,
      'USD'
    );

    it('Get annualized performance', async () => {
      expect(
        portfolioCalculator
          .getAnnualizedPerformancePercent({
            daysInMarket: NaN, // differenceInDays of date-fns returns NaN for the same day
            netPerformancePercent: new Big(0)
          })
          .toNumber()
      ).toEqual(0);

      expect(
        portfolioCalculator
          .getAnnualizedPerformancePercent({
            daysInMarket: 0,
            netPerformancePercent: new Big(0)
          })
          .toNumber()
      ).toEqual(0);

      /**
       * Source: https://www.readyratios.com/reference/analysis/annualized_rate.html
       */
      expect(
        portfolioCalculator
          .getAnnualizedPerformancePercent({
            daysInMarket: 65, // < 1 year
            netPerformancePercent: new Big(0.1025)
          })
          .toNumber()
      ).toBeCloseTo(0.729705);

      expect(
        portfolioCalculator
          .getAnnualizedPerformancePercent({
            daysInMarket: 365, // 1 year
            netPerformancePercent: new Big(0.05)
          })
          .toNumber()
      ).toBeCloseTo(0.05);

      /**
       * Source: https://www.investopedia.com/terms/a/annualized-total-return.asp#annualized-return-formula-and-calculation
       */
      expect(
        portfolioCalculator
          .getAnnualizedPerformancePercent({
            daysInMarket: 575, // > 1 year
            netPerformancePercent: new Big(0.2374)
          })
          .toNumber()
      ).toBeCloseTo(0.145);
    });
  });
});

const ordersMixedSymbols: PortfolioOrder[] = [
  {
    date: '2017-01-03',
    name: 'Tesla, Inc.',
    quantity: new Big('50'),
    symbol: 'TSLA',
    type: OrderType.Buy,
    unitPrice: new Big('42.97'),
    currency: 'USD',
    dataSource: DataSource.YAHOO,
    fee: new Big(0)
  },
  {
    date: '2017-07-01',
    name: 'Bitcoin USD',
    quantity: new Big('0.5614682'),
    symbol: 'BTCUSD',
    type: OrderType.Buy,
    unitPrice: new Big('3562.089535970158'),
    currency: 'USD',
    dataSource: DataSource.YAHOO,
    fee: new Big(0)
  },
  {
    date: '2018-09-01',
    name: 'Amazon.com, Inc.',
    quantity: new Big('5'),
    symbol: 'AMZN',
    type: OrderType.Buy,
    unitPrice: new Big('2021.99'),
    currency: 'USD',
    dataSource: DataSource.YAHOO,
    fee: new Big(0)
  }
];

const ordersVTI: PortfolioOrder[] = [
  {
    date: '2019-02-01',
    name: 'Vanguard Total Stock Market Index Fund ETF Shares',
    quantity: new Big('10'),
    symbol: 'VTI',
    type: OrderType.Buy,
    unitPrice: new Big('144.38'),
    currency: 'USD',
    dataSource: DataSource.YAHOO,
    fee: new Big(0)
  },
  {
    date: '2019-08-03',
    name: 'Vanguard Total Stock Market Index Fund ETF Shares',
    quantity: new Big('10'),
    symbol: 'VTI',
    type: OrderType.Buy,
    unitPrice: new Big('147.99'),
    currency: 'USD',
    dataSource: DataSource.YAHOO,
    fee: new Big(0)
  },
  {
    date: '2020-02-02',
    name: 'Vanguard Total Stock Market Index Fund ETF Shares',
    quantity: new Big('15'),
    symbol: 'VTI',
    type: OrderType.Sell,
    unitPrice: new Big('151.41'),
    currency: 'USD',
    dataSource: DataSource.YAHOO,
    fee: new Big(0)
  },
  {
    date: '2021-08-01',
    name: 'Vanguard Total Stock Market Index Fund ETF Shares',
    quantity: new Big('10'),
    symbol: 'VTI',
    type: OrderType.Buy,
    unitPrice: new Big('177.69'),
    currency: 'USD',
    dataSource: DataSource.YAHOO,
    fee: new Big(0)
  },
  {
    date: '2021-02-01',
    name: 'Vanguard Total Stock Market Index Fund ETF Shares',
    quantity: new Big('10'),
    symbol: 'VTI',
    type: OrderType.Buy,
    unitPrice: new Big('203.15'),
    currency: 'USD',
    dataSource: DataSource.YAHOO,
    fee: new Big(0)
  }
];

const orderTslaTransactionPoint: TransactionPoint[] = [
  {
    date: '2021-01-01',
    items: [
      {
        quantity: new Big('1'),
        symbol: 'TSLA',
        investment: new Big('719.46'),
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        firstBuyDate: '2021-01-01',
        fee: new Big(0),
        transactionCount: 1
      }
    ]
  }
];

const ordersVTITransactionPoints: TransactionPoint[] = [
  {
    date: '2019-02-01',
    items: [
      {
        quantity: new Big('10'),
        symbol: 'VTI',
        investment: new Big('1443.8'),
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        firstBuyDate: '2019-02-01',
        fee: new Big(0),
        transactionCount: 1
      }
    ]
  },
  {
    date: '2019-08-03',
    items: [
      {
        quantity: new Big('20'),
        symbol: 'VTI',
        investment: new Big('2923.7'),
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        firstBuyDate: '2019-02-01',
        fee: new Big(0),
        transactionCount: 2
      }
    ]
  },
  {
    date: '2020-02-02',
    items: [
      {
        quantity: new Big('5'),
        symbol: 'VTI',
        investment: new Big('652.55'),
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        firstBuyDate: '2019-02-01',
        fee: new Big(0),
        transactionCount: 3
      }
    ]
  },
  {
    date: '2021-02-01',
    items: [
      {
        quantity: new Big('15'),
        symbol: 'VTI',
        investment: new Big('2684.05'),
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        firstBuyDate: '2019-02-01',
        fee: new Big(0),
        transactionCount: 4
      }
    ]
  },
  {
    date: '2021-08-01',
    items: [
      {
        quantity: new Big('25'),
        symbol: 'VTI',
        investment: new Big('4460.95'),
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        firstBuyDate: '2019-02-01',
        fee: new Big(0),
        transactionCount: 5
      }
    ]
  }
];

const transactionPointsBuyAndSell: TransactionPoint[] = [
  {
    date: '2019-02-01',
    items: [
      {
        quantity: new Big('10'),
        symbol: 'VTI',
        investment: new Big('1443.8'),
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        firstBuyDate: '2019-02-01',
        fee: new Big(0),
        transactionCount: 1
      }
    ]
  },
  {
    date: '2019-08-03',
    items: [
      {
        quantity: new Big('20'),
        symbol: 'VTI',
        investment: new Big('2923.7'),
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        firstBuyDate: '2019-02-01',
        fee: new Big(0),
        transactionCount: 2
      }
    ]
  },
  {
    date: '2019-09-01',
    items: [
      {
        quantity: new Big('5'),
        symbol: 'AMZN',
        investment: new Big('10109.95'),
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        firstBuyDate: '2019-09-01',
        fee: new Big(0),
        transactionCount: 1
      },
      {
        quantity: new Big('20'),
        symbol: 'VTI',
        investment: new Big('2923.7'),
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        firstBuyDate: '2019-02-01',
        fee: new Big(0),
        transactionCount: 2
      }
    ]
  },
  {
    date: '2020-02-02',
    items: [
      {
        quantity: new Big('5'),
        symbol: 'AMZN',
        investment: new Big('10109.95'),
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        firstBuyDate: '2019-09-01',
        fee: new Big(0),
        transactionCount: 1
      },
      {
        quantity: new Big('5'),
        symbol: 'VTI',
        investment: new Big('652.55'),
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        firstBuyDate: '2019-02-01',
        fee: new Big(0),
        transactionCount: 3
      }
    ]
  },
  {
    date: '2020-08-02',
    items: [
      {
        quantity: new Big('0'),
        symbol: 'AMZN',
        investment: new Big('0'),
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        firstBuyDate: '2019-09-01',
        fee: new Big(0),
        transactionCount: 2
      },
      {
        quantity: new Big('5'),
        symbol: 'VTI',
        investment: new Big('652.55'),
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        firstBuyDate: '2019-02-01',
        fee: new Big(0),
        transactionCount: 3
      }
    ]
  },
  {
    date: '2021-02-01',
    items: [
      {
        quantity: new Big('0'),
        symbol: 'AMZN',
        investment: new Big('0'),
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        firstBuyDate: '2019-09-01',
        fee: new Big(0),
        transactionCount: 2
      },
      {
        quantity: new Big('15'),
        symbol: 'VTI',
        investment: new Big('2684.05'),
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        firstBuyDate: '2019-02-01',
        fee: new Big(0),
        transactionCount: 4
      }
    ]
  },
  {
    date: '2021-08-01',
    items: [
      {
        quantity: new Big('0'),
        symbol: 'AMZN',
        investment: new Big('0'),
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        firstBuyDate: '2019-09-01',
        fee: new Big(0),
        transactionCount: 2
      },
      {
        quantity: new Big('25'),
        symbol: 'VTI',
        investment: new Big('4460.95'),
        currency: 'USD',
        dataSource: DataSource.YAHOO,
        firstBuyDate: '2019-02-01',
        fee: new Big(0),
        transactionCount: 5
      }
    ]
  }
];
