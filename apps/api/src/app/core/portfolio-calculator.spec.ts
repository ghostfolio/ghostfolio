import {
  CurrentRateService,
  GetValueParams,
  GetValuesParams
} from '@ghostfolio/api/app/core/current-rate.service';
import {
  PortfolioCalculator,
  PortfolioOrder,
  TimelinePeriod,
  TimelineSpecification,
  TransactionPoint
} from '@ghostfolio/api/app/core/portfolio-calculator';
import { OrderType } from '@ghostfolio/api/models/order-type';
import { resetHours } from '@ghostfolio/common/helper';
import { Currency } from '@prisma/client';
import Big from 'big.js';
import {
  addDays,
  differenceInCalendarDays,
  endOfDay,
  isBefore,
  parse
} from 'date-fns';

function toYearMonthDay(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return [year, month, day];
}

function dateEqual(date1: Date, date2: Date) {
  const date1Converted = toYearMonthDay(date1);
  const date2Converted = toYearMonthDay(date2);

  return (
    date1Converted[0] === date2Converted[0] &&
    date1Converted[1] === date2Converted[1] &&
    date1Converted[2] === date2Converted[2]
  );
}

function mockGetValue(symbol: string, date: Date) {
  const today = new Date();
  if (symbol === 'VTI') {
    if (dateEqual(today, date)) {
      return { marketPrice: 213.32 };
    } else if (dateEqual(parse('2021-07-26', 'yyyy-MM-dd', new Date()), date)) {
      return { marketPrice: 227.92 };
    } else {
      const startDate = parse('2019-02-01', 'yyyy-MM-dd', new Date());
      const daysInBetween = differenceInCalendarDays(date, startDate);

      const marketPrice = new Big('144.38').plus(
        new Big('0.08').mul(daysInBetween)
      );
      return { marketPrice: marketPrice.toNumber() };
    }
  } else if (symbol === 'AMZN') {
    return { marketPrice: 2021.99 };
  } else {
    return { marketPrice: 0 };
  }
}

jest.mock('@ghostfolio/api/app/core/current-rate.service', () => {
  return {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    CurrentRateService: jest.fn().mockImplementation(() => {
      return {
        getValue: ({
          date,
          symbol,
          currency,
          userCurrency
        }: GetValueParams) => {
          return Promise.resolve(mockGetValue(symbol, date));
        },
        getValues: ({
          currencies,
          dateQuery,
          symbols,
          userCurrency
        }: GetValuesParams) => {
          const result = [];
          if (dateQuery.lt) {
            for (
              let date = resetHours(dateQuery.gte);
              isBefore(date, endOfDay(dateQuery.lt));
              date = addDays(date, 1)
            ) {
              for (const symbol of symbols) {
                result.push({
                  date,
                  symbol,
                  marketPrice: mockGetValue(symbol, date).marketPrice
                });
              }
            }
          } else {
            for (const date of dateQuery.in) {
              for (const symbol of symbols) {
                result.push({
                  date,
                  symbol,
                  marketPrice: mockGetValue(symbol, date).marketPrice
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
        Currency.USD
      );
      portfolioCalculator.computeTransactionPoints(ordersVTI);
      const portfolioItemsAtTransactionPoints =
        portfolioCalculator.getTransactionPoints();

      expect(portfolioItemsAtTransactionPoints).toEqual(
        ordersVTITransactionPoints
      );
    });

    it('with two orders at the same day of the same type', () => {
      const orders = [
        ...ordersVTI,
        {
          date: '2021-02-01',
          name: 'Vanguard Total Stock Market Index Fund ETF Shares',
          quantity: new Big('20'),
          symbol: 'VTI',
          type: OrderType.Buy,
          unitPrice: new Big('197.15'),
          currency: Currency.USD
        }
      ];
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        Currency.USD
      );
      portfolioCalculator.computeTransactionPoints(orders);
      const portfolioItemsAtTransactionPoints =
        portfolioCalculator.getTransactionPoints();

      expect(portfolioItemsAtTransactionPoints).toEqual([
        {
          date: '2019-02-01',
          items: [
            {
              name: 'Vanguard Total Stock Market Index Fund ETF Shares',
              quantity: new Big('10'),
              symbol: 'VTI',
              investment: new Big('1443.8'),
              currency: Currency.USD,
              firstBuyDate: '2019-02-01',
              transactionCount: 1
            }
          ]
        },
        {
          date: '2019-08-03',
          items: [
            {
              name: 'Vanguard Total Stock Market Index Fund ETF Shares',
              quantity: new Big('20'),
              symbol: 'VTI',
              investment: new Big('2923.7'),
              currency: Currency.USD,
              firstBuyDate: '2019-02-01',
              transactionCount: 2
            }
          ]
        },
        {
          date: '2020-02-02',
          items: [
            {
              name: 'Vanguard Total Stock Market Index Fund ETF Shares',
              quantity: new Big('5'),
              symbol: 'VTI',
              investment: new Big('652.55'),
              currency: Currency.USD,
              firstBuyDate: '2019-02-01',
              transactionCount: 3
            }
          ]
        },
        {
          date: '2021-02-01',
          items: [
            {
              name: 'Vanguard Total Stock Market Index Fund ETF Shares',
              quantity: new Big('35'),
              symbol: 'VTI',
              investment: new Big('6627.05'),
              currency: Currency.USD,
              firstBuyDate: '2019-02-01',
              transactionCount: 5
            }
          ]
        },
        {
          date: '2021-08-01',
          items: [
            {
              name: 'Vanguard Total Stock Market Index Fund ETF Shares',
              quantity: new Big('45'),
              symbol: 'VTI',
              investment: new Big('8403.95'),
              currency: Currency.USD,
              firstBuyDate: '2019-02-01',
              transactionCount: 6
            }
          ]
        }
      ]);
    });

    it('with additional order', () => {
      const orders = [
        ...ordersVTI,
        {
          date: '2019-09-01',
          name: 'Amazon.com, Inc.',
          quantity: new Big('5'),
          symbol: 'AMZN',
          type: OrderType.Buy,
          unitPrice: new Big('2021.99'),
          currency: Currency.USD
        }
      ];
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        Currency.USD
      );
      portfolioCalculator.computeTransactionPoints(orders);
      const portfolioItemsAtTransactionPoints =
        portfolioCalculator.getTransactionPoints();

      expect(portfolioItemsAtTransactionPoints).toEqual([
        {
          date: '2019-02-01',
          items: [
            {
              name: 'Vanguard Total Stock Market Index Fund ETF Shares',
              quantity: new Big('10'),
              symbol: 'VTI',
              investment: new Big('1443.8'),
              currency: Currency.USD,
              firstBuyDate: '2019-02-01',
              transactionCount: 1
            }
          ]
        },
        {
          date: '2019-08-03',
          items: [
            {
              name: 'Vanguard Total Stock Market Index Fund ETF Shares',
              quantity: new Big('20'),
              symbol: 'VTI',
              investment: new Big('2923.7'),
              currency: Currency.USD,
              firstBuyDate: '2019-02-01',
              transactionCount: 2
            }
          ]
        },
        {
          date: '2019-09-01',
          items: [
            {
              name: 'Amazon.com, Inc.',
              quantity: new Big('5'),
              symbol: 'AMZN',
              investment: new Big('10109.95'),
              currency: Currency.USD,
              firstBuyDate: '2019-09-01',
              transactionCount: 1
            },
            {
              name: 'Vanguard Total Stock Market Index Fund ETF Shares',
              quantity: new Big('20'),
              symbol: 'VTI',
              investment: new Big('2923.7'),
              currency: Currency.USD,
              firstBuyDate: '2019-02-01',
              transactionCount: 2
            }
          ]
        },
        {
          date: '2020-02-02',
          items: [
            {
              name: 'Amazon.com, Inc.',
              quantity: new Big('5'),
              symbol: 'AMZN',
              investment: new Big('10109.95'),
              currency: Currency.USD,
              firstBuyDate: '2019-09-01',
              transactionCount: 1
            },
            {
              name: 'Vanguard Total Stock Market Index Fund ETF Shares',
              quantity: new Big('5'),
              symbol: 'VTI',
              investment: new Big('652.55'),
              currency: Currency.USD,
              firstBuyDate: '2019-02-01',
              transactionCount: 3
            }
          ]
        },
        {
          date: '2021-02-01',
          items: [
            {
              name: 'Amazon.com, Inc.',
              quantity: new Big('5'),
              symbol: 'AMZN',
              investment: new Big('10109.95'),
              currency: Currency.USD,
              firstBuyDate: '2019-09-01',
              transactionCount: 1
            },
            {
              name: 'Vanguard Total Stock Market Index Fund ETF Shares',
              quantity: new Big('15'),
              symbol: 'VTI',
              investment: new Big('2684.05'),
              currency: Currency.USD,
              firstBuyDate: '2019-02-01',
              transactionCount: 4
            }
          ]
        },
        {
          date: '2021-08-01',
          items: [
            {
              name: 'Amazon.com, Inc.',
              quantity: new Big('5'),
              symbol: 'AMZN',
              investment: new Big('10109.95'),
              currency: Currency.USD,
              firstBuyDate: '2019-09-01',
              transactionCount: 1
            },
            {
              name: 'Vanguard Total Stock Market Index Fund ETF Shares',
              quantity: new Big('25'),
              symbol: 'VTI',
              investment: new Big('4460.95'),
              currency: Currency.USD,
              firstBuyDate: '2019-02-01',
              transactionCount: 5
            }
          ]
        }
      ]);
    });

    it('with additional buy & sell', () => {
      const orders = [
        ...ordersVTI,
        {
          date: '2019-09-01',
          name: 'Amazon.com, Inc.',
          quantity: new Big('5'),
          symbol: 'AMZN',
          type: OrderType.Buy,
          unitPrice: new Big('2021.99'),
          currency: Currency.USD
        },
        {
          date: '2020-08-02',
          name: 'Amazon.com, Inc.',
          quantity: new Big('5'),
          symbol: 'AMZN',
          type: OrderType.Sell,
          unitPrice: new Big('2412.23'),
          currency: Currency.USD
        }
      ];
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        Currency.USD
      );
      portfolioCalculator.computeTransactionPoints(orders);
      const portfolioItemsAtTransactionPoints =
        portfolioCalculator.getTransactionPoints();

      expect(portfolioItemsAtTransactionPoints).toEqual([
        {
          date: '2019-02-01',
          items: [
            {
              name: 'Vanguard Total Stock Market Index Fund ETF Shares',
              quantity: new Big('10'),
              symbol: 'VTI',
              investment: new Big('1443.8'),
              currency: Currency.USD,
              firstBuyDate: '2019-02-01',
              transactionCount: 1
            }
          ]
        },
        {
          date: '2019-08-03',
          items: [
            {
              name: 'Vanguard Total Stock Market Index Fund ETF Shares',
              quantity: new Big('20'),
              symbol: 'VTI',
              investment: new Big('2923.7'),
              currency: Currency.USD,
              firstBuyDate: '2019-02-01',
              transactionCount: 2
            }
          ]
        },
        {
          date: '2019-09-01',
          items: [
            {
              name: 'Amazon.com, Inc.',
              quantity: new Big('5'),
              symbol: 'AMZN',
              investment: new Big('10109.95'),
              currency: Currency.USD,
              firstBuyDate: '2019-09-01',
              transactionCount: 1
            },
            {
              name: 'Vanguard Total Stock Market Index Fund ETF Shares',
              quantity: new Big('20'),
              symbol: 'VTI',
              investment: new Big('2923.7'),
              currency: Currency.USD,
              firstBuyDate: '2019-02-01',
              transactionCount: 2
            }
          ]
        },
        {
          date: '2020-02-02',
          items: [
            {
              name: 'Amazon.com, Inc.',
              quantity: new Big('5'),
              symbol: 'AMZN',
              investment: new Big('10109.95'),
              currency: Currency.USD,
              firstBuyDate: '2019-09-01',
              transactionCount: 1
            },
            {
              name: 'Vanguard Total Stock Market Index Fund ETF Shares',
              quantity: new Big('5'),
              symbol: 'VTI',
              investment: new Big('652.55'),
              currency: Currency.USD,
              firstBuyDate: '2019-02-01',
              transactionCount: 3
            }
          ]
        },
        {
          date: '2020-08-02',
          items: [
            {
              name: 'Vanguard Total Stock Market Index Fund ETF Shares',
              quantity: new Big('5'),
              symbol: 'VTI',
              investment: new Big('652.55'),
              currency: Currency.USD,
              firstBuyDate: '2019-02-01',
              transactionCount: 3
            }
          ]
        },
        {
          date: '2021-02-01',
          items: [
            {
              name: 'Vanguard Total Stock Market Index Fund ETF Shares',
              quantity: new Big('15'),
              symbol: 'VTI',
              investment: new Big('2684.05'),
              currency: Currency.USD,
              firstBuyDate: '2019-02-01',
              transactionCount: 4
            }
          ]
        },
        {
          date: '2021-08-01',
          items: [
            {
              name: 'Vanguard Total Stock Market Index Fund ETF Shares',
              quantity: new Big('25'),
              symbol: 'VTI',
              investment: new Big('4460.95'),
              currency: Currency.USD,
              firstBuyDate: '2019-02-01',
              transactionCount: 5
            }
          ]
        }
      ]);
    });

    it('with mixed symbols', () => {
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        Currency.USD
      );
      portfolioCalculator.computeTransactionPoints(ordersMixedSymbols);
      const portfolioItemsAtTransactionPoints =
        portfolioCalculator.getTransactionPoints();

      expect(portfolioItemsAtTransactionPoints).toEqual([
        {
          date: '2017-01-03',
          items: [
            {
              name: 'Tesla, Inc.',
              quantity: new Big('50'),
              symbol: 'TSLA',
              investment: new Big('2148.5'),
              currency: Currency.USD,
              firstBuyDate: '2017-01-03',
              transactionCount: 1
            }
          ]
        },
        {
          date: '2017-07-01',
          items: [
            {
              name: 'Bitcoin USD',
              quantity: new Big('0.5614682'),
              symbol: 'BTCUSD',
              investment: new Big('1999.9999999999998659756'),
              currency: Currency.USD,
              firstBuyDate: '2017-07-01',
              transactionCount: 1
            },
            {
              name: 'Tesla, Inc.',
              quantity: new Big('50'),
              symbol: 'TSLA',
              investment: new Big('2148.5'),
              currency: Currency.USD,
              firstBuyDate: '2017-01-03',
              transactionCount: 1
            }
          ]
        },
        {
          date: '2018-09-01',
          items: [
            {
              name: 'Amazon.com, Inc.',
              quantity: new Big('5'),
              symbol: 'AMZN',
              investment: new Big('10109.95'),
              currency: Currency.USD,
              firstBuyDate: '2018-09-01',
              transactionCount: 1
            },
            {
              name: 'Bitcoin USD',
              quantity: new Big('0.5614682'),
              symbol: 'BTCUSD',
              investment: new Big('1999.9999999999998659756'),
              currency: Currency.USD,
              firstBuyDate: '2017-07-01',
              transactionCount: 1
            },
            {
              name: 'Tesla, Inc.',
              quantity: new Big('50'),
              symbol: 'TSLA',
              investment: new Big('2148.5'),
              currency: Currency.USD,
              firstBuyDate: '2017-01-03',
              transactionCount: 1
            }
          ]
        }
      ]);
    });
  });

  describe('get current positions', () => {
    fit('with single VTI', async () => {
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        Currency.USD
      );
      portfolioCalculator.setTransactionPoints(orderVTITransactionPoint);

      const spy = jest
        .spyOn(Date, 'now')
        .mockImplementation(() => new Date(Date.UTC(2021, 6, 26)).getTime()); // 2021-07-26
      const currentPositions = await portfolioCalculator.getCurrentPositions(
        parse('2021-07-26', 'yyyy-MM-dd', new Date())
      );
      spy.mockRestore();

      expect(currentPositions).toEqual({
        hasErrors: false,
        positions: [
          {
            averagePrice: new Big('195.39'),
            currency: 'USD',
            firstBuyDate: '2021-01-01',
            grossPerformance: new Big('32.53'), // 227.92-195.39=32.53
            grossPerformancePercentage: new Big('0.166487537745023'), // (227.92-195.39)/195.39=0.166487537745023
            investment: new Big('195.39'),
            marketPrice: 227.92,
            name: 'Vanguard Total Stock Market Index Fund ETF Shares',
            quantity: new Big('1'),
            symbol: 'VTI',
            transactionCount: 1
          }
        ]
      });
    });

    it('with VTI only', async () => {
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        Currency.USD
      );
      portfolioCalculator.setTransactionPoints(ordersVTITransactionPoints);

      const spy = jest
        .spyOn(Date, 'now')
        .mockImplementation(() => new Date(Date.UTC(2020, 9, 24)).getTime()); // 2020-10-24
      const currentPositions = await portfolioCalculator.getCurrentPositions(
        parse('2019-01-01', 'yyyy-MM-dd', new Date())
      );
      spy.mockRestore();

      expect(currentPositions).toEqual({
        hasErrors: false,
        positions: [
          {
            averagePrice: new Big('178.438'),
            currency: 'USD',
            firstBuyDate: '2019-02-01',
            // see next test for details about how to calculate this
            grossPerformance: new Big('265.2'),
            grossPerformancePercentage: new Big(
              '0.37322057787174066244232522865731355471028555367747465860626740684417274277219590953836818016777856'
            ),
            investment: new Big('4460.95'),
            marketPrice: 194.86,
            name: 'Vanguard Total Stock Market Index Fund ETF Shares',
            quantity: new Big('25'),
            symbol: 'VTI',
            transactionCount: 5
          }
        ]
      });
    });

    it('with performance since Jan 1st, 2020', async () => {
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        Currency.USD
      );
      const transactionPoints = [
        {
          date: '2019-02-01',
          items: [
            {
              quantity: new Big('10'),
              name: 'Vanguard Total Stock Market Index Fund ETF Shares',
              symbol: 'VTI',
              investment: new Big('1443.8'),
              currency: Currency.USD,
              firstBuyDate: '2019-02-01',
              transactionCount: 1
            }
          ]
        },
        {
          date: '2020-08-03',
          items: [
            {
              quantity: new Big('20'),
              name: 'Vanguard Total Stock Market Index Fund ETF Shares',
              symbol: 'VTI',
              investment: new Big('2923.7'),
              currency: Currency.USD,
              firstBuyDate: '2019-02-01',
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
      // 2020-08-03         -> days 549 => value: VTI: 144.38+549*0.08=188.3  => 10*188.30=1883 => 1883/1711=1.100526008 - 1 = 0.100526008
      // 2020-08-03         -> days 549 => value: VTI: 144.38+549*0.08=188.3  => 20*188.30=3766
      // 2020-10-24 [today] -> days 631 => value: VTI: 144.38+631*0.08=194.86 => 20*194.86=3897.2 => 3897.2/3766=1.034838024 - 1 = 0.034838024
      // gross performance: 1883-1711 + 3897.2-3766 = 303.2
      // gross performance percentage: 1.100526008 * 1.034838024 = 1.138866159 => 13.89 %

      const currentPositions = await portfolioCalculator.getCurrentPositions(
        parse('2020-01-01', 'yyyy-MM-dd', new Date())
      );

      spy.mockRestore();
      expect(currentPositions).toEqual({
        hasErrors: false,
        positions: [
          {
            averagePrice: new Big('146.185'),
            firstBuyDate: '2019-02-01',
            quantity: new Big('20'),
            symbol: 'VTI',
            investment: new Big('2923.7'),
            marketPrice: 194.86,
            transactionCount: 2,
            grossPerformance: new Big('303.2'),
            grossPerformancePercentage: new Big(
              '0.1388661601402688486251911721754180022242'
            ),
            name: 'Vanguard Total Stock Market Index Fund ETF Shares',
            currency: 'USD'
          }
        ]
      });
    });
  });

  describe('calculate timeline', () => {
    it('with yearly', async () => {
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        Currency.USD
      );
      portfolioCalculator.setTransactionPoints(ordersVTITransactionPoints);
      const timelineSpecification: TimelineSpecification[] = [
        {
          start: '2019-01-01',
          accuracy: 'year'
        }
      ];
      const timeline: TimelinePeriod[] =
        await portfolioCalculator.calculateTimeline(
          timelineSpecification,
          '2021-06-30'
        );

      expect(timeline).toEqual([
        {
          date: '2019-01-01',
          grossPerformance: new Big('0'),
          investment: new Big('0'),
          value: new Big('0')
        },
        {
          date: '2020-01-01',
          grossPerformance: new Big('498.3'),
          investment: new Big('2923.7'),
          value: new Big('3422') // 20 * (144.38 + days=335 * 0.08)
        },
        {
          date: '2021-01-01',
          grossPerformance: new Big('349.35'),
          investment: new Big('652.55'),
          value: new Big('1001.9') // 5 * (144.38 + days=700 * 0.08)
        }
      ]);
    });

    it('with monthly', async () => {
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        Currency.USD
      );
      portfolioCalculator.setTransactionPoints(ordersVTITransactionPoints);
      const timelineSpecification: TimelineSpecification[] = [
        {
          start: '2019-01-01',
          accuracy: 'month'
        }
      ];
      const timeline: TimelinePeriod[] =
        await portfolioCalculator.calculateTimeline(
          timelineSpecification,
          '2021-06-30'
        );

      expect(timeline).toEqual([
        {
          date: '2019-01-01',
          grossPerformance: new Big('0'),
          investment: new Big('0'),
          value: new Big('0')
        },
        {
          date: '2019-02-01',
          grossPerformance: new Big('0'),
          investment: new Big('1443.8'),
          value: new Big('1443.8') // 10 * (144.38 + days=0 * 0.08)
        },
        {
          date: '2019-03-01',
          grossPerformance: new Big('22.4'),
          investment: new Big('1443.8'),
          value: new Big('1466.2') // 10 * (144.38 + days=28 * 0.08)
        },
        {
          date: '2019-04-01',
          grossPerformance: new Big('47.2'),
          investment: new Big('1443.8'),
          value: new Big('1491') // 10 * (144.38 + days=59 * 0.08)
        },
        {
          date: '2019-05-01',
          grossPerformance: new Big('71.2'),
          investment: new Big('1443.8'),
          value: new Big('1515') // 10 * (144.38 + days=89 * 0.08)
        },
        {
          date: '2019-06-01',
          grossPerformance: new Big('96'),
          investment: new Big('1443.8'),
          value: new Big('1539.8') // 10 * (144.38 + days=120 * 0.08)
        },
        {
          date: '2019-07-01',
          grossPerformance: new Big('120'),
          investment: new Big('1443.8'),
          value: new Big('1563.8') // 10 * (144.38 + days=150 * 0.08)
        },
        {
          date: '2019-08-01',
          grossPerformance: new Big('144.8'),
          investment: new Big('1443.8'),
          value: new Big('1588.6') // 10 * (144.38 + days=181 * 0.08)
        },
        {
          date: '2019-09-01',
          grossPerformance: new Big('303.1'),
          investment: new Big('2923.7'),
          value: new Big('3226.8') // 20 * (144.38 + days=212 * 0.08)
        },
        {
          date: '2019-10-01',
          grossPerformance: new Big('351.1'),
          investment: new Big('2923.7'),
          value: new Big('3274.8') // 20 * (144.38 + days=242 * 0.08)
        },
        {
          date: '2019-11-01',
          grossPerformance: new Big('400.7'),
          investment: new Big('2923.7'),
          value: new Big('3324.4') // 20 * (144.38 + days=273 * 0.08)
        },
        {
          date: '2019-12-01',
          grossPerformance: new Big('448.7'),
          investment: new Big('2923.7'),
          value: new Big('3372.4') // 20 * (144.38 + days=303 * 0.08)
        },
        {
          date: '2020-01-01',
          grossPerformance: new Big('498.3'),
          investment: new Big('2923.7'),
          value: new Big('3422') // 20 * (144.38 + days=335 * 0.08)
        },
        {
          date: '2020-02-01',
          grossPerformance: new Big('547.9'),
          investment: new Big('2923.7'),
          value: new Big('3471.6') // 20 * (144.38 + days=365 * 0.08)
        },
        {
          date: '2020-03-01',
          grossPerformance: new Big('226.95'),
          investment: new Big('652.55'),
          value: new Big('879.5') // 5 * (144.38 + days=394 * 0.08)
        },
        {
          date: '2020-04-01',
          grossPerformance: new Big('239.35'),
          investment: new Big('652.55'),
          value: new Big('891.9') // 5 * (144.38 + days=425 * 0.08)
        },
        {
          date: '2020-05-01',
          grossPerformance: new Big('251.35'),
          investment: new Big('652.55'),
          value: new Big('903.9') // 5 * (144.38 + days=455 * 0.08)
        },
        {
          date: '2020-06-01',
          grossPerformance: new Big('263.75'),
          investment: new Big('652.55'),
          value: new Big('916.3') // 5 * (144.38 + days=486 * 0.08)
        },
        {
          date: '2020-07-01',
          grossPerformance: new Big('275.75'),
          investment: new Big('652.55'),
          value: new Big('928.3') // 5 * (144.38 + days=516 * 0.08)
        },
        {
          date: '2020-08-01',
          grossPerformance: new Big('288.15'),
          investment: new Big('652.55'),
          value: new Big('940.7') // 5 * (144.38 + days=547 * 0.08)
        },
        {
          date: '2020-09-01',
          grossPerformance: new Big('300.55'),
          investment: new Big('652.55'),
          value: new Big('953.1') // 5 * (144.38 + days=578 * 0.08)
        },
        {
          date: '2020-10-01',
          grossPerformance: new Big('312.55'),
          investment: new Big('652.55'),
          value: new Big('965.1') // 5 * (144.38 + days=608 * 0.08)
        },
        {
          date: '2020-11-01',
          grossPerformance: new Big('324.95'),
          investment: new Big('652.55'),
          value: new Big('977.5') // 5 * (144.38 + days=639 * 0.08)
        },
        {
          date: '2020-12-01',
          grossPerformance: new Big('336.95'),
          investment: new Big('652.55'),
          value: new Big('989.5') // 5 * (144.38 + days=669 * 0.08)
        },
        {
          date: '2021-01-01',
          grossPerformance: new Big('349.35'),
          investment: new Big('652.55'),
          value: new Big('1001.9') // 5 * (144.38 + days=700 * 0.08)
        },
        {
          date: '2021-02-01',
          grossPerformance: new Big('358.85'),
          investment: new Big('2684.05'),
          value: new Big('3042.9') // 15 * (144.38 + days=731 * 0.08)
        },
        {
          date: '2021-03-01',
          grossPerformance: new Big('392.45'),
          investment: new Big('2684.05'),
          value: new Big('3076.5') // 15 * (144.38 + days=759 * 0.08)
        },
        {
          date: '2021-04-01',
          grossPerformance: new Big('429.65'),
          investment: new Big('2684.05'),
          value: new Big('3113.7') // 15 * (144.38 + days=790 * 0.08)
        },
        {
          date: '2021-05-01',
          grossPerformance: new Big('465.65'),
          investment: new Big('2684.05'),
          value: new Big('3149.7') // 15 * (144.38 + days=820 * 0.08)
        },
        {
          date: '2021-06-01',
          grossPerformance: new Big('502.85'),
          investment: new Big('2684.05'),
          value: new Big('3186.9') // 15 * (144.38 + days=851 * 0.08)
        }
      ]);
    });

    it('with yearly and monthly mixed', async () => {
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        Currency.USD
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
      const timeline: TimelinePeriod[] =
        await portfolioCalculator.calculateTimeline(
          timelineSpecification,
          '2021-06-30'
        );

      expect(timeline).toEqual([
        {
          date: '2019-01-01',
          grossPerformance: new Big('0'),
          investment: new Big('0'),
          value: new Big('0')
        },
        {
          date: '2020-01-01',
          grossPerformance: new Big('498.3'),
          investment: new Big('2923.7'),
          value: new Big('3422') // 20 * (144.38 + days=335 * 0.08)
        },
        {
          date: '2021-01-01',
          grossPerformance: new Big('349.35'),
          investment: new Big('652.55'),
          value: new Big('1001.9') // 5 * (144.38 + days=700 * 0.08)
        },
        {
          date: '2021-02-01',
          grossPerformance: new Big('358.85'),
          investment: new Big('2684.05'),
          value: new Big('3042.9') // 15 * (144.38 + days=731 * 0.08)
        },
        {
          date: '2021-03-01',
          grossPerformance: new Big('392.45'),
          investment: new Big('2684.05'),
          value: new Big('3076.5') // 15 * (144.38 + days=759 * 0.08)
        },
        {
          date: '2021-04-01',
          grossPerformance: new Big('429.65'),
          investment: new Big('2684.05'),
          value: new Big('3113.7') // 15 * (144.38 + days=790 * 0.08)
        },
        {
          date: '2021-05-01',
          grossPerformance: new Big('465.65'),
          investment: new Big('2684.05'),
          value: new Big('3149.7') // 15 * (144.38 + days=820 * 0.08)
        },
        {
          date: '2021-06-01',
          grossPerformance: new Big('502.85'),
          investment: new Big('2684.05'),
          value: new Big('3186.9') // 15 * (144.38 + days=851 * 0.08)
        }
      ]);
    });

    it('with all mixed', async () => {
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        Currency.USD
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
      const timeline: TimelinePeriod[] =
        await portfolioCalculator.calculateTimeline(
          timelineSpecification,
          '2021-06-30'
        );

      expect(timeline).toEqual(
        expect.objectContaining([
          {
            date: '2019-01-01',
            grossPerformance: new Big('0'),
            investment: new Big('0'),
            value: new Big('0')
          },
          {
            date: '2020-01-01',
            grossPerformance: new Big('498.3'),
            investment: new Big('2923.7'),
            value: new Big('3422') // 20 * (144.38 + days=335 * 0.08)
          },
          {
            date: '2021-01-01',
            grossPerformance: new Big('349.35'),
            investment: new Big('652.55'),
            value: new Big('1001.9') // 5 * (144.38 + days=700 * 0.08)
          },
          {
            date: '2021-02-01',
            grossPerformance: new Big('358.85'),
            investment: new Big('2684.05'),
            value: new Big('3042.9') // 15 * (144.38 + days=731 * 0.08)
          },
          {
            date: '2021-03-01',
            grossPerformance: new Big('392.45'),
            investment: new Big('2684.05'),
            value: new Big('3076.5') // 15 * (144.38 + days=759 * 0.08)
          },
          {
            date: '2021-04-01',
            grossPerformance: new Big('429.65'),
            investment: new Big('2684.05'),
            value: new Big('3113.7') // 15 * (144.38 + days=790 * 0.08)
          },
          {
            date: '2021-05-01',
            grossPerformance: new Big('465.65'),
            investment: new Big('2684.05'),
            value: new Big('3149.7') // 15 * (144.38 + days=820 * 0.08)
          },
          {
            date: '2021-06-01',
            grossPerformance: new Big('502.85'),
            investment: new Big('2684.05'),
            value: new Big('3186.9') // 15 * (144.38 + days=851 * 0.08)
          },
          {
            date: '2021-06-02',
            grossPerformance: new Big('504.05'),
            investment: new Big('2684.05'),
            value: new Big('3188.1') // 15 * (144.38 + days=852 * 0.08) / +1.2
          },
          {
            date: '2021-06-03',
            grossPerformance: new Big('505.25'),
            investment: new Big('2684.05'),
            value: new Big('3189.3') // +1.2
          },
          {
            date: '2021-06-04',
            grossPerformance: new Big('506.45'),
            investment: new Big('2684.05'),
            value: new Big('3190.5') // +1.2
          },
          {
            date: '2021-06-05',
            grossPerformance: new Big('507.65'),
            investment: new Big('2684.05'),
            value: new Big('3191.7') // +1.2
          },
          {
            date: '2021-06-06',
            grossPerformance: new Big('508.85'),
            investment: new Big('2684.05'),
            value: new Big('3192.9') // +1.2
          },
          {
            date: '2021-06-07',
            grossPerformance: new Big('510.05'),
            investment: new Big('2684.05'),
            value: new Big('3194.1') // +1.2
          },
          {
            date: '2021-06-08',
            grossPerformance: new Big('511.25'),
            investment: new Big('2684.05'),
            value: new Big('3195.3') // +1.2
          },
          {
            date: '2021-06-09',
            grossPerformance: new Big('512.45'),
            investment: new Big('2684.05'),
            value: new Big('3196.5') // +1.2
          },
          {
            date: '2021-06-10',
            grossPerformance: new Big('513.65'),
            investment: new Big('2684.05'),
            value: new Big('3197.7') // +1.2
          },
          {
            date: '2021-06-11',
            grossPerformance: new Big('514.85'),
            investment: new Big('2684.05'),
            value: new Big('3198.9') // +1.2
          },
          {
            date: '2021-06-12',
            grossPerformance: new Big('516.05'),
            investment: new Big('2684.05'),
            value: new Big('3200.1') // +1.2
          },
          {
            date: '2021-06-13',
            grossPerformance: new Big('517.25'),
            investment: new Big('2684.05'),
            value: new Big('3201.3') // +1.2
          },
          {
            date: '2021-06-14',
            grossPerformance: new Big('518.45'),
            investment: new Big('2684.05'),
            value: new Big('3202.5') // +1.2
          },
          {
            date: '2021-06-15',
            grossPerformance: new Big('519.65'),
            investment: new Big('2684.05'),
            value: new Big('3203.7') // +1.2
          },
          {
            date: '2021-06-16',
            grossPerformance: new Big('520.85'),
            investment: new Big('2684.05'),
            value: new Big('3204.9') // +1.2
          },
          {
            date: '2021-06-17',
            grossPerformance: new Big('522.05'),
            investment: new Big('2684.05'),
            value: new Big('3206.1') // +1.2
          },
          {
            date: '2021-06-18',
            grossPerformance: new Big('523.25'),
            investment: new Big('2684.05'),
            value: new Big('3207.3') // +1.2
          },
          {
            date: '2021-06-19',
            grossPerformance: new Big('524.45'),
            investment: new Big('2684.05'),
            value: new Big('3208.5') // +1.2
          },
          {
            date: '2021-06-20',
            grossPerformance: new Big('525.65'),
            investment: new Big('2684.05'),
            value: new Big('3209.7') // +1.2
          },
          {
            date: '2021-06-21',
            grossPerformance: new Big('526.85'),
            investment: new Big('2684.05'),
            value: new Big('3210.9') // +1.2
          },
          {
            date: '2021-06-22',
            grossPerformance: new Big('528.05'),
            investment: new Big('2684.05'),
            value: new Big('3212.1') // +1.2
          },
          {
            date: '2021-06-23',
            grossPerformance: new Big('529.25'),
            investment: new Big('2684.05'),
            value: new Big('3213.3') // +1.2
          },
          {
            date: '2021-06-24',
            grossPerformance: new Big('530.45'),
            investment: new Big('2684.05'),
            value: new Big('3214.5') // +1.2
          },
          {
            date: '2021-06-25',
            grossPerformance: new Big('531.65'),
            investment: new Big('2684.05'),
            value: new Big('3215.7') // +1.2
          },
          {
            date: '2021-06-26',
            grossPerformance: new Big('532.85'),
            investment: new Big('2684.05'),
            value: new Big('3216.9') // +1.2
          },
          {
            date: '2021-06-27',
            grossPerformance: new Big('534.05'),
            investment: new Big('2684.05'),
            value: new Big('3218.1') // +1.2
          },
          {
            date: '2021-06-28',
            grossPerformance: new Big('535.25'),
            investment: new Big('2684.05'),
            value: new Big('3219.3') // +1.2
          },
          {
            date: '2021-06-29',
            grossPerformance: new Big('536.45'),
            investment: new Big('2684.05'),
            value: new Big('3220.5') // +1.2
          },
          {
            date: '2021-06-30',
            grossPerformance: new Big('537.65'),
            investment: new Big('2684.05'),
            value: new Big('3221.7') // +1.2
          }
        ])
      );
    });

    it('with mixed portfolio', async () => {
      const portfolioCalculator = new PortfolioCalculator(
        currentRateService,
        Currency.USD
      );
      portfolioCalculator.setTransactionPoints([
        {
          date: '2019-02-01',
          items: [
            {
              name: 'Amazon.com, Inc.',
              quantity: new Big('5'),
              symbol: 'AMZN',
              investment: new Big('10109.95'),
              currency: Currency.USD,
              firstBuyDate: '2019-02-01',
              transactionCount: 1
            },
            {
              name: 'Vanguard Total Stock Market Index Fund ETF Shares',
              quantity: new Big('10'),
              symbol: 'VTI',
              investment: new Big('1443.8'),
              currency: Currency.USD,
              firstBuyDate: '2019-02-01',
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
      const timeline: TimelinePeriod[] =
        await portfolioCalculator.calculateTimeline(
          timelineSpecification,
          '2020-01-01'
        );

      expect(timeline).toEqual([
        {
          date: '2019-01-01',
          grossPerformance: new Big('0'),
          investment: new Big('0'),
          value: new Big('0')
        },
        {
          date: '2020-01-01',
          grossPerformance: new Big('267.2'),
          investment: new Big('11553.75'),
          value: new Big('11820.95') // 10 * (144.38 + days=334 * 0.08) + 5 * 2021.99
        }
      ]);
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
    currency: Currency.USD
  },
  {
    date: '2017-07-01',
    name: 'Bitcoin USD',
    quantity: new Big('0.5614682'),
    symbol: 'BTCUSD',
    type: OrderType.Buy,
    unitPrice: new Big('3562.089535970158'),
    currency: Currency.USD
  },
  {
    date: '2018-09-01',
    name: 'Amazon.com, Inc.',
    quantity: new Big('5'),
    symbol: 'AMZN',
    type: OrderType.Buy,
    unitPrice: new Big('2021.99'),
    currency: Currency.USD
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
    currency: Currency.USD
  },
  {
    date: '2019-08-03',
    name: 'Vanguard Total Stock Market Index Fund ETF Shares',
    quantity: new Big('10'),
    symbol: 'VTI',
    type: OrderType.Buy,
    unitPrice: new Big('147.99'),
    currency: Currency.USD
  },
  {
    date: '2020-02-02',
    name: 'Vanguard Total Stock Market Index Fund ETF Shares',
    quantity: new Big('15'),
    symbol: 'VTI',
    type: OrderType.Sell,
    unitPrice: new Big('151.41'),
    currency: Currency.USD
  },
  {
    date: '2021-08-01',
    name: 'Vanguard Total Stock Market Index Fund ETF Shares',
    quantity: new Big('10'),
    symbol: 'VTI',
    type: OrderType.Buy,
    unitPrice: new Big('177.69'),
    currency: Currency.USD
  },
  {
    date: '2021-02-01',
    name: 'Vanguard Total Stock Market Index Fund ETF Shares',
    quantity: new Big('10'),
    symbol: 'VTI',
    type: OrderType.Buy,
    unitPrice: new Big('203.15'),
    currency: Currency.USD
  }
];

const orderVTITransactionPoint: TransactionPoint[] = [
  {
    date: '2021-01-01',
    items: [
      {
        name: 'Vanguard Total Stock Market Index Fund ETF Shares',
        quantity: new Big('1'),
        symbol: 'VTI',
        investment: new Big('195.39'),
        currency: Currency.USD,
        firstBuyDate: '2021-01-01',
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
        name: 'Vanguard Total Stock Market Index Fund ETF Shares',
        quantity: new Big('10'),
        symbol: 'VTI',
        investment: new Big('1443.8'),
        currency: Currency.USD,
        firstBuyDate: '2019-02-01',
        transactionCount: 1
      }
    ]
  },
  {
    date: '2019-08-03',
    items: [
      {
        name: 'Vanguard Total Stock Market Index Fund ETF Shares',
        quantity: new Big('20'),
        symbol: 'VTI',
        investment: new Big('2923.7'),
        currency: Currency.USD,
        firstBuyDate: '2019-02-01',
        transactionCount: 2
      }
    ]
  },
  {
    date: '2020-02-02',
    items: [
      {
        name: 'Vanguard Total Stock Market Index Fund ETF Shares',
        quantity: new Big('5'),
        symbol: 'VTI',
        investment: new Big('652.55'),
        currency: Currency.USD,
        firstBuyDate: '2019-02-01',
        transactionCount: 3
      }
    ]
  },
  {
    date: '2021-02-01',
    items: [
      {
        name: 'Vanguard Total Stock Market Index Fund ETF Shares',
        quantity: new Big('15'),
        symbol: 'VTI',
        investment: new Big('2684.05'),
        currency: Currency.USD,
        firstBuyDate: '2019-02-01',
        transactionCount: 4
      }
    ]
  },
  {
    date: '2021-08-01',
    items: [
      {
        name: 'Vanguard Total Stock Market Index Fund ETF Shares',
        quantity: new Big('25'),
        symbol: 'VTI',
        investment: new Big('4460.95'),
        currency: Currency.USD,
        firstBuyDate: '2019-02-01',
        transactionCount: 5
      }
    ]
  }
];
