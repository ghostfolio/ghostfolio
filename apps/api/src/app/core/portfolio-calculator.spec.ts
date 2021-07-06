import { PortfolioCalculator, PortfolioOrder } from '@ghostfolio/api/app/core/portfolio-calculator';
import { CurrentRateService, GetValueParams } from '@ghostfolio/api/app/core/current-rate.service';
import { Currency } from '@prisma/client';
import { OrderType } from '@ghostfolio/api/models/order-type';
import Big from 'big.js';

function toYearMonthDay(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return [year, month, day];
}

function dateEqual(date1: Date, date2: Date) {
  const date1Converted = toYearMonthDay(date1);
  const date2Converted = toYearMonthDay(date2);

  return date1Converted[0] === date2Converted[0]&&
    date1Converted[1] === date2Converted[1] &&
    date1Converted[2] === date2Converted[2]
}

jest.mock('./current-rate.service.ts', () => {
  return {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    CurrentRateService: jest.fn().mockImplementation(() => {
      return {
        getValue: ({date, symbol, currency, userCurrency}: GetValueParams) => {
          const today = new Date();
          if (dateEqual(today, date) && symbol === 'VTI') {
            return Promise.resolve(new Big('213.32'));
          }


          return Promise.resolve(new Big('0'));
        }
      };
    })
  };
});

describe('PortfolioCalculator', () => {

  let currentRateService: CurrentRateService;
  beforeEach(() => {
    currentRateService = new CurrentRateService(null, null);
  });

  describe('calculate transaction points', () => {
    it('with orders of only one symbol', () => {
      const portfolioCalculator = new PortfolioCalculator(currentRateService, Currency.USD);
      portfolioCalculator.computeTransactionPoints(ordersVTI);
      const portfolioItemsAtTransactionPoints = portfolioCalculator.getTransactionPoints();

      expect(portfolioItemsAtTransactionPoints).toEqual(ordersVTITransactionPoints);
    });

    it('with two orders at the same day of the same type', () => {
      const orders = [
        ...ordersVTI,
        {
          date: '2021-02-01',
          quantity: new Big('20'),
          symbol: 'VTI',
          type: OrderType.Buy,
          unitPrice: new Big('197.15'),
          currency: Currency.USD
        }
      ];
      const portfolioCalculator = new PortfolioCalculator(currentRateService, Currency.USD);
      portfolioCalculator.computeTransactionPoints(orders);
      const portfolioItemsAtTransactionPoints = portfolioCalculator.getTransactionPoints();

      expect(portfolioItemsAtTransactionPoints).toEqual([
        {
          date: '2019-02-01',
          items: [{
            quantity: new Big('10'),
            symbol: 'VTI',
            investment: new Big('1443.8'),
            currency: Currency.USD,
            firstBuyDate: '2019-02-01',
            transactionCount: 1
          }]
        },
        {
          date: '2019-08-03',
          items: [{
            quantity: new Big('20'),
            symbol: 'VTI',
            investment: new Big('2923.7'),
            currency: Currency.USD,
            firstBuyDate: '2019-02-01',
            transactionCount: 2
          }]
        },
        {
          date: '2020-02-02',
          items: [{
            quantity: new Big('5'),
            symbol: 'VTI',
            investment: new Big('652.55'),
            currency: Currency.USD,
            firstBuyDate: '2019-02-01',
            transactionCount: 3
          }]
        },
        {
          date: '2021-02-01',
          items: [{
            quantity: new Big('35'),
            symbol: 'VTI',
            investment: new Big('6627.05'),
            currency: Currency.USD,
            firstBuyDate: '2019-02-01',
            transactionCount: 5
          }]
        },
        {
          date: '2021-08-01',
          items: [{
            quantity: new Big('45'),
            symbol: 'VTI',
            investment: new Big('8403.95'),
            currency: Currency.USD,
            firstBuyDate: '2019-02-01',
            transactionCount: 6
          }]
        }
      ]);
    });

    it('with additional order', () => {
      const orders = [
        ...ordersVTI,
        {
          date: '2019-09-01',
          quantity: new Big('5'),
          symbol: 'AMZN',
          type: OrderType.Buy,
          unitPrice: new Big('2021.99'),
          currency: Currency.USD
        }
      ];
      const portfolioCalculator = new PortfolioCalculator(currentRateService, Currency.USD);
      portfolioCalculator.computeTransactionPoints(orders);
      const portfolioItemsAtTransactionPoints = portfolioCalculator.getTransactionPoints();

      expect(portfolioItemsAtTransactionPoints).toEqual([
        {
          date: '2019-02-01',
          items: [{
            quantity: new Big('10'),
            symbol: 'VTI',
            investment: new Big('1443.8'),
            currency: Currency.USD,
            firstBuyDate: '2019-02-01',
            transactionCount: 1
          }]
        },
        {
          date: '2019-08-03',
          items: [{
            quantity: new Big('20'),
            symbol: 'VTI',
            investment: new Big('2923.7'),
            currency: Currency.USD,
            firstBuyDate: '2019-02-01',
            transactionCount: 2
          }]
        },
        {
          date: '2019-09-01',
          items: [{
            quantity: new Big('5'),
            symbol: 'AMZN',
            investment: new Big('10109.95'),
            currency: Currency.USD,
            firstBuyDate: '2019-09-01',
            transactionCount: 1
          }, {
            quantity: new Big('20'),
            symbol: 'VTI',
            investment: new Big('2923.7'),
            currency: Currency.USD,
            firstBuyDate: '2019-02-01',
            transactionCount: 2
          }]
        },
        {
          date: '2020-02-02',
          items: [{
            quantity: new Big('5'),
            symbol: 'AMZN',
            investment: new Big('10109.95'),
            currency: Currency.USD,
            firstBuyDate: '2019-09-01',
            transactionCount: 1
          }, {
            quantity: new Big('5'),
            symbol: 'VTI',
            investment: new Big('652.55'),
            currency: Currency.USD,
            firstBuyDate: '2019-02-01',
            transactionCount: 3
          }]
        },
        {
          date: '2021-02-01',
          items: [{
            quantity: new Big('5'),
            symbol: 'AMZN',
            investment: new Big('10109.95'),
            currency: Currency.USD,
            firstBuyDate: '2019-09-01',
            transactionCount: 1
          }, {
            quantity: new Big('15'),
            symbol: 'VTI',
            investment: new Big('2684.05'),
            currency: Currency.USD,
            firstBuyDate: '2019-02-01',
            transactionCount: 4
          }]
        },
        {
          date: '2021-08-01',
          items: [{
            quantity: new Big('5'),
            symbol: 'AMZN',
            investment: new Big('10109.95'),
            currency: Currency.USD,
            firstBuyDate: '2019-09-01',
            transactionCount: 1
          }, {
            quantity: new Big('25'),
            symbol: 'VTI',
            investment: new Big('4460.95'),
            currency: Currency.USD,
            firstBuyDate: '2019-02-01',
            transactionCount: 5
          }]
        }
      ]);
    });

    it('with additional buy & sell', () => {
      const orders = [
        ...ordersVTI,
        {
          date: '2019-09-01',
          quantity: new Big('5'),
          symbol: 'AMZN',
          type: OrderType.Buy,
          unitPrice: new Big('2021.99'),
          currency: Currency.USD
        },
        {
          date: '2020-08-02',
          quantity: new Big('5'),
          symbol: 'AMZN',
          type: OrderType.Sell,
          unitPrice: new Big('2412.23'),
          currency: Currency.USD
        }
      ];
      const portfolioCalculator = new PortfolioCalculator(currentRateService, Currency.USD);
      portfolioCalculator.computeTransactionPoints(orders);
      const portfolioItemsAtTransactionPoints = portfolioCalculator.getTransactionPoints();

      expect(portfolioItemsAtTransactionPoints).toEqual([
        {
          date: '2019-02-01',
          items: [{
            quantity: new Big('10'),
            symbol: 'VTI',
            investment: new Big('1443.8'),
            currency: Currency.USD,
            firstBuyDate: '2019-02-01',
            transactionCount: 1
          }]
        },
        {
          date: '2019-08-03',
          items: [{
            quantity: new Big('20'),
            symbol: 'VTI',
            investment: new Big('2923.7'),
            currency: Currency.USD,
            firstBuyDate: '2019-02-01',
            transactionCount: 2
          }]
        },
        {
          date: '2019-09-01',
          items: [{
            quantity: new Big('5'),
            symbol: 'AMZN',
            investment: new Big('10109.95'),
            currency: Currency.USD,
            firstBuyDate: '2019-09-01',
            transactionCount: 1
          }, {
            quantity: new Big('20'),
            symbol: 'VTI',
            investment: new Big('2923.7'),
            currency: Currency.USD,
            firstBuyDate: '2019-02-01',
            transactionCount: 2
          }]
        },
        {
          date: '2020-02-02',
          items: [{
            quantity: new Big('5'),
            symbol: 'AMZN',
            investment: new Big('10109.95'),
            currency: Currency.USD,
            firstBuyDate: '2019-09-01',
            transactionCount: 1
          }, {
            quantity: new Big('5'),
            symbol: 'VTI',
            investment: new Big('652.55'),
            currency: Currency.USD,
            firstBuyDate: '2019-02-01',
            transactionCount: 3
          }]
        },
        {
          date: '2020-08-02',
          items: [{
            quantity: new Big('5'),
            symbol: 'VTI',
            investment: new Big('652.55'),
            currency: Currency.USD,
            firstBuyDate: '2019-02-01',
            transactionCount: 3
          }]
        },
        {
          date: '2021-02-01',
          items: [{
            quantity: new Big('15'),
            symbol: 'VTI',
            investment: new Big('2684.05'),
            currency: Currency.USD,
            firstBuyDate: '2019-02-01',
            transactionCount: 4
          }]
        },
        {
          date: '2021-08-01',
          items: [{
            quantity: new Big('25'),
            symbol: 'VTI',
            investment: new Big('4460.95'),
            currency: Currency.USD,
            firstBuyDate: '2019-02-01',
            transactionCount: 5
          }]
        }
      ]);
    });

    it('with mixed symbols', () => {
      const portfolioCalculator = new PortfolioCalculator(currentRateService, Currency.USD);
      portfolioCalculator.computeTransactionPoints(ordersMixedSymbols);
      const portfolioItemsAtTransactionPoints = portfolioCalculator.getTransactionPoints();

      expect(portfolioItemsAtTransactionPoints).toEqual([
        {
          date: '2017-01-03',
          items: [{
            quantity: new Big('50'),
            symbol: 'TSLA',
            investment: new Big('2148.5'),
            currency: Currency.USD,
            firstBuyDate: '2017-01-03',
            transactionCount: 1
          }]
        },
        {
          date: '2017-07-01',
          items: [{
            quantity: new Big('0.5614682'),
            symbol: 'BTCUSD',
            investment: new Big('1999.9999999999998659756'),
            currency: Currency.USD,
            firstBuyDate: '2017-07-01',
            transactionCount: 1
          }, {
            quantity: new Big('50'),
            symbol: 'TSLA',
            investment: new Big('2148.5'),
            currency: Currency.USD,
            firstBuyDate: '2017-01-03',
            transactionCount: 1
          }]
        },
        {
          date: '2018-09-01',
          items: [{
            quantity: new Big('5'),
            symbol: 'AMZN',
            investment: new Big('10109.95'),
            currency: Currency.USD,
            firstBuyDate: '2018-09-01',
            transactionCount: 1
          }, {
            quantity: new Big('0.5614682'),
            symbol: 'BTCUSD',
            investment: new Big('1999.9999999999998659756'),
            currency: Currency.USD,
            firstBuyDate: '2017-07-01',
            transactionCount: 1
          }, {
            quantity: new Big('50'),
            symbol: 'TSLA',
            investment: new Big('2148.5'),
            currency: Currency.USD,
            firstBuyDate: '2017-01-03',
            transactionCount: 1
          }]
        }
      ]);
    });
  });

  describe('get current positions', () => {

    it('with just VTI', async () => {
      const portfolioCalculator = new PortfolioCalculator(currentRateService, Currency.USD);
      portfolioCalculator.setTransactionPoints(ordersVTITransactionPoints);
      const currentPositions = await portfolioCalculator.getCurrentPositions();

      expect(currentPositions).toEqual({
        // eslint-disable-next-line @typescript-eslint/naming-convention
        VTI: {
          averagePrice: new Big('178.438'),
          firstBuyDate: '2019-02-01',
          quantity: new Big('25'),
          symbol: 'VTI',
          investment: new Big('4460.95'),
          marketPrice: new Big('213.32'),
          transactionCount: 5
        }
      });


    })

  })

});
const ordersMixedSymbols: PortfolioOrder[] = [
  {
    date: '2017-01-03',
    quantity: new Big('50'),
    symbol: 'TSLA',
    type: OrderType.Buy,
    unitPrice: new Big('42.97'),
    currency: Currency.USD
  },
  {
    date: '2017-07-01',
    quantity: new Big('0.5614682'),
    symbol: 'BTCUSD',
    type: OrderType.Buy,
    unitPrice: new Big('3562.089535970158'),
    currency: Currency.USD
  },
  {
    date: '2018-09-01',
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
    quantity: new Big('10'),
    symbol: 'VTI',
    type: OrderType.Buy,
    unitPrice: new Big('144.38'),
    currency: Currency.USD
  },
  {
    date: '2019-08-03',
    quantity: new Big('10'),
    symbol: 'VTI',
    type: OrderType.Buy,
    unitPrice: new Big('147.99'),
    currency: Currency.USD
  },
  {
    date: '2020-02-02',
    quantity: new Big('15'),
    symbol: 'VTI',
    type: OrderType.Sell,
    unitPrice: new Big('151.41'),
    currency: Currency.USD
  },
  {
    date: '2021-08-01',
    quantity: new Big('10'),
    symbol: 'VTI',
    type: OrderType.Buy,
    unitPrice: new Big('177.69'),
    currency: Currency.USD
  },
  {
    date: '2021-02-01',
    quantity: new Big('10'),
    symbol: 'VTI',
    type: OrderType.Buy,
    unitPrice: new Big('203.15'),
    currency: Currency.USD
  }
];

const ordersVTITransactionPoints = [
  {
    date: '2019-02-01',
    items: [{
      quantity: new Big('10'),
      symbol: 'VTI',
      investment: new Big('1443.8'),
      currency: Currency.USD,
      firstBuyDate: '2019-02-01',
      transactionCount: 1
    }]
  },
  {
    date: '2019-08-03',
    items: [{
      quantity: new Big('20'),
      symbol: 'VTI',
      investment: new Big('2923.7'),
      currency: Currency.USD,
      firstBuyDate: '2019-02-01',
      transactionCount: 2
    }]
  },
  {
    date: '2020-02-02',
    items: [{
      quantity: new Big('5'),
      symbol: 'VTI',
      investment: new Big('652.55'),
      currency: Currency.USD,
      firstBuyDate: '2019-02-01',
      transactionCount: 3
    }]
  },
  {
    date: '2021-02-01',
    items: [{
      quantity: new Big('15'),
      symbol: 'VTI',
      investment: new Big('2684.05'),
      currency: Currency.USD,
      firstBuyDate: '2019-02-01',
      transactionCount: 4
    }]
  },
  {
    date: '2021-08-01',
    items: [{
      quantity: new Big('25'),
      symbol: 'VTI',
      investment: new Big('4460.95'),
      currency: Currency.USD,
      firstBuyDate: '2019-02-01',
      transactionCount: 5
    }]
  }
];
