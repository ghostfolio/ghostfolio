import { HistoricalDataItem } from '@ghostfolio/common/interfaces';

import { RoaiPortfolioCalculator } from './portfolio-calculator';

describe('ROAI period return for PnL calendar', () => {
  const calculate = (historicalDataItems: HistoricalDataItem[]) => {
    // Use the real ROAI implementation without initializing market-data services.
    const calculator = Object.create(
      RoaiPortfolioCalculator.prototype
    ) as RoaiPortfolioCalculator;
    const method = calculator as unknown as {
      calculatePerformancePercentagesForDateRange: (args: {
        historicalDataItems: HistoricalDataItem[];
      }) => Record<
        string,
        { netPerformanceInPercentageWithCurrencyEffect: number }
      >;
    };
    return method.calculatePerformancePercentagesForDateRange({
      historicalDataItems
    });
  };

  it('returns 10 percent with no contributions', () => {
    const result = calculate([
      {
        date: '2026-01-01',
        value: 1000,
        valueWithCurrencyEffect: 1000,
        totalInvestment: 1000,
        totalInvestmentValueWithCurrencyEffect: 1000,
        netPerformance: 0,
        netPerformanceWithCurrencyEffect: 0,
        dividendInBaseCurrency: 0
      },
      {
        date: '2026-01-02',
        value: 1100,
        valueWithCurrencyEffect: 1100,
        totalInvestment: 1000,
        totalInvestmentValueWithCurrencyEffect: 1000,
        netPerformance: 100,
        netPerformanceWithCurrencyEffect: 100,
        dividendInBaseCurrency: 0
      }
    ]);
    expect(
      result['2026-01-02'].netPerformanceInPercentageWithCurrencyEffect
    ).toBeCloseTo(0.1);
  });

  it('accounts for a contribution in the ROAI denominator', () => {
    const result = calculate([
      {
        date: '2026-01-01',
        value: 1000,
        valueWithCurrencyEffect: 1000,
        totalInvestment: 1000,
        totalInvestmentValueWithCurrencyEffect: 1000,
        netPerformance: 0,
        netPerformanceWithCurrencyEffect: 0,
        dividendInBaseCurrency: 0
      },
      {
        date: '2026-01-02',
        value: 2100,
        valueWithCurrencyEffect: 2100,
        totalInvestment: 2000,
        totalInvestmentValueWithCurrencyEffect: 2000,
        netPerformance: 100,
        netPerformanceWithCurrencyEffect: 100,
        dividendInBaseCurrency: 0
      }
    ]);
    // 100 / average(1000, 2000) = 6.666...% rather than 10%.
    expect(
      result['2026-01-02'].netPerformanceInPercentageWithCurrencyEffect
    ).toBeCloseTo(1 / 15);
  });

  it('accounts for a withdrawal in the ROAI denominator', () => {
    const result = calculate([
      {
        date: '2026-01-01',
        value: 1000,
        valueWithCurrencyEffect: 1000,
        totalInvestment: 1000,
        totalInvestmentValueWithCurrencyEffect: 1000,
        netPerformance: 0,
        netPerformanceWithCurrencyEffect: 0,
        dividendInBaseCurrency: 0
      },
      {
        date: '2026-01-02',
        value: 550,
        valueWithCurrencyEffect: 550,
        totalInvestment: 500,
        totalInvestmentValueWithCurrencyEffect: 500,
        netPerformance: 50,
        netPerformanceWithCurrencyEffect: 50,
        dividendInBaseCurrency: 0
      }
    ]);
    // 50 / average(1000, 500) = 6.666...% rather than 5%.
    expect(
      result['2026-01-02'].netPerformanceInPercentageWithCurrencyEffect
    ).toBeCloseTo(1 / 15);
  });

  it('calculates a negative return without external flows', () => {
    const result = calculate([
      {
        date: '2026-03-01',
        value: 1000,
        valueWithCurrencyEffect: 1000,
        totalInvestment: 1000,
        totalInvestmentValueWithCurrencyEffect: 1000,
        netPerformance: 0,
        netPerformanceWithCurrencyEffect: 0,
        dividendInBaseCurrency: 0
      },
      {
        date: '2026-03-02',
        value: 900,
        valueWithCurrencyEffect: 900,
        totalInvestment: 1000,
        totalInvestmentValueWithCurrencyEffect: 1000,
        netPerformance: -100,
        netPerformanceWithCurrencyEffect: -100,
        dividendInBaseCurrency: 0
      }
    ]);
    expect(
      result['2026-03-02'].netPerformanceInPercentageWithCurrencyEffect
    ).toBeCloseTo(-0.1);
  });

  it('computes a multi-day period from the complete ROAI investment history', () => {
    const result = calculate([
      {
        date: '2026-01-31',
        value: 1000,
        valueWithCurrencyEffect: 1000,
        totalInvestment: 1000,
        totalInvestmentValueWithCurrencyEffect: 1000,
        netPerformance: 0,
        netPerformanceWithCurrencyEffect: 0,
        dividendInBaseCurrency: 0
      },
      {
        date: '2026-02-01',
        value: 1100,
        valueWithCurrencyEffect: 1100,
        totalInvestment: 1000,
        totalInvestmentValueWithCurrencyEffect: 1000,
        netPerformance: 100,
        netPerformanceWithCurrencyEffect: 100,
        dividendInBaseCurrency: 0
      },
      {
        date: '2026-02-02',
        value: 2200,
        valueWithCurrencyEffect: 2200,
        totalInvestment: 2000,
        totalInvestmentValueWithCurrencyEffect: 2000,
        netPerformance: 200,
        netPerformanceWithCurrencyEffect: 200,
        dividendInBaseCurrency: 0
      }
    ]);
    // Average capital = (1000 + 1000 + 2000) / 3; performance = 200.
    expect(
      result['2026-02-02'].netPerformanceInPercentageWithCurrencyEffect
    ).toBeCloseTo(0.15);
  });

  it('does not produce a non-finite percentage for zero capital', () => {
    const result = calculate([
      {
        date: '2026-04-01',
        value: 0,
        valueWithCurrencyEffect: 0,
        totalInvestment: 0,
        totalInvestmentValueWithCurrencyEffect: 0,
        netPerformance: 0,
        netPerformanceWithCurrencyEffect: 0,
        dividendInBaseCurrency: 0
      },
      {
        date: '2026-04-02',
        value: 0,
        valueWithCurrencyEffect: 0,
        totalInvestment: 0,
        totalInvestmentValueWithCurrencyEffect: 0,
        netPerformance: 0,
        netPerformanceWithCurrencyEffect: 0,
        dividendInBaseCurrency: 0
      }
    ]);
    expect(
      Number.isFinite(
        result['2026-04-02'].netPerformanceInPercentageWithCurrencyEffect
      )
    ).toBe(true);
  });
});
