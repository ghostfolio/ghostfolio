import { addDays, format } from 'date-fns';

import {
  getTimeAxisUnit,
  getTimeSeriesTickCallback,
  getTooltipOptions,
  getTradingDayItems
} from './chart-helper';
import { DATE_FORMAT } from './helper';

describe('getTooltipOptions', () => {
  const getLabel = ({
    currency,
    locale,
    unit,
    y
  }: {
    currency?: string;
    locale: string;
    unit?: string;
    y: number;
  }) => {
    const { callbacks } = getTooltipOptions({
      currency,
      locale,
      unit,
      colorScheme: 'LIGHT'
    });

    return (callbacks?.label as (context: unknown) => string)({
      dataset: { label: 'Performance' },
      parsed: { y, x: 0 }
    });
  };

  it('formats the value with the locale for a currency', () => {
    expect(getLabel({ currency: 'EUR', locale: 'en-US', y: 1234.5 })).toBe(
      'Performance: 1,234.50 EUR'
    );
  });

  it('formats the value with the locale for a unit', () => {
    expect(getLabel({ locale: 'fr', unit: '%', y: 0.86 })).toBe(
      'Performance: 0,86 %'
    );
  });

  it('formats the value with the locale and grouping for a unit', () => {
    expect(getLabel({ locale: 'de', unit: '%', y: 1234.5 })).toBe(
      'Performance: 1.234,50 %'
    );
  });

  it('formats the value with the locale without a unit', () => {
    expect(getLabel({ locale: 'de', y: 1234.5 })).toBe('Performance: 1.234,50');
  });
});

describe('getTimeAxisUnit', () => {
  it.each([
    ['1d', 'hour'],
    ['wtd', 'day'],
    ['mtd', 'day'],
    ['ytd', 'month'],
    ['1y', false],
    ['2025', 'month'],
    ['5y', false],
    ['max', false],
    [undefined, 'year']
  ])('uses the unit of %s', (dateRange, unit) => {
    expect(getTimeAxisUnit(dateRange)).toBe(unit);
  });
});

describe('getTradingDayItems', () => {
  // Thursday
  const now = new Date(2026, 11, 24);

  it('skips the weekends', () => {
    const items = getTradingDayItems({
      dateRange: '1y',
      now,
      items: [
        { date: '2026-12-18', value: 1 },
        { date: '2026-12-19', value: 1 },
        { date: '2026-12-20', value: 1 },
        { date: '2026-12-21', value: 2 }
      ]
    });

    expect(items.map(({ date }) => date)).toEqual(['2026-12-18', '2026-12-21']);
  });

  it('adds the remaining trading days of the year', () => {
    const items = getTradingDayItems({
      dateRange: 'ytd',
      now,
      items: [{ date: '2026-12-24', value: 1 }]
    });

    expect(items).toEqual([
      { date: '2026-12-24', value: 1 },
      { date: '2026-12-25', value: null },
      { date: '2026-12-28', value: null },
      { date: '2026-12-29', value: null },
      { date: '2026-12-30', value: null },
      { date: '2026-12-31', value: null }
    ]);
  });
});

describe('getTimeSeriesTickCallback', () => {
  it('labels the first point of each hour', () => {
    const ticks = [
      new Date(2026, 9, 22, 9, 0),
      new Date(2026, 9, 22, 9, 30),
      new Date(2026, 9, 22, 10, 0),
      new Date(2026, 9, 22, 10, 30)
    ].map((date) => {
      return { value: date.getTime() };
    });

    const callback = getTimeSeriesTickCallback('hour');

    expect(
      ticks.map(({ value }, index) => {
        return callback(value, index, ticks);
      })
    ).toEqual(['09:00', '', '10:00', '']);
  });

  it('labels the start of each trading day, also after a post-market past midnight', () => {
    const ticks = [
      new Date(2026, 9, 22, 21, 0),
      new Date(2026, 9, 22, 23, 0),
      new Date(2026, 9, 23, 1, 0),
      new Date(2026, 9, 23, 9, 0)
    ].map((date) => {
      return { value: date.getTime() };
    });

    const callback = getTimeSeriesTickCallback('day');

    expect(
      ticks.map(({ value }, index) => {
        return callback(value, index, ticks);
      })
    ).toEqual(['Thu 22', '', '', 'Fri 23']);
  });

  it('thins out the labels', () => {
    const ticks = Array.from({ length: 20 }, (_, index) => {
      return { value: new Date(2026, 0, 1 + index).getTime() };
    });

    const callback = getTimeSeriesTickCallback('day', 5);
    const labels = ticks
      .map(({ value }, index) => {
        return callback(value, index, ticks);
      })
      .filter(Boolean);

    expect(labels.length).toBeLessThanOrEqual(5);
  });
});

describe('getTradingDayItems with many items', () => {
  it('keeps one point per week (the last trading day)', () => {
    const items = Array.from({ length: 28 }, (_, index) => {
      return {
        date: format(addDays(new Date(2026, 0, 5), index), DATE_FORMAT),
        value: index
      };
    });

    const result = getTradingDayItems({ dateRange: '1y', items, maxItems: 10 });

    expect(
      result.map(({ date }) => {
        return date;
      })
    ).toEqual([
      '2026-01-05',
      '2026-01-09',
      '2026-01-16',
      '2026-01-23',
      '2026-01-30'
    ]);
  });
});
