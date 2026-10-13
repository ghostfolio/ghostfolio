import {
  addCalendarDays,
  aggregatePnlCalendarDays,
  aggregatePnlCalendarWeekInMonth,
  getLocalTodayKey,
  getMonday,
  getPnlCalendarDays
} from './portfolio-pnl-calendar.helper';

describe('PnL calendar', () => {
  it('calculates monetary PnL and changes in percentage points from cumulative values', () => {
    const days = getPnlCalendarDays([
      {
        date: '2026-01-01',
        netPerformanceWithCurrencyEffect: 50,
        netPerformanceInPercentageWithCurrencyEffect: 0.05
      },
      {
        date: '2026-01-02',
        netPerformanceWithCurrencyEffect: 65,
        netPerformanceInPercentageWithCurrencyEffect: 0.055
      },
      {
        date: '2026-01-03',
        netPerformanceWithCurrencyEffect: 60,
        netPerformanceInPercentageWithCurrencyEffect: 0.04
      }
    ]);

    expect(days[0].amount).toBe(15);
    expect(days[0].percentagePoints).toBeCloseTo(0.5);
    expect(days[1].amount).toBe(-5);
    expect(days[1].percentagePoints).toBeCloseTo(-1.5);
  });

  it('does not confuse capital deposits with profit', () => {
    expect(
      getPnlCalendarDays([
        {
          date: '2026-03-10',
          netPerformanceWithCurrencyEffect: 25,
          valueWithCurrencyEffect: 1000
        },
        {
          date: '2026-03-11',
          netPerformanceWithCurrencyEffect: 25,
          valueWithCurrencyEffect: 11000
        }
      ])[0].amount
    ).toBe(0);
  });

  it('does not invent values when performance fields are absent', () => {
    expect(
      getPnlCalendarDays([
        { date: '2026-01-01' },
        { date: '2026-01-02', netPerformanceWithCurrencyEffect: 10 },
        {
          date: '2026-01-03',
          netPerformanceWithCurrencyEffect: 15,
          netPerformanceInPercentageWithCurrencyEffect: 0.02
        }
      ])
    ).toEqual([{ amount: 5, date: '2026-01-03', percentagePoints: undefined }]);
  });

  it('aggregates only observed days and distinguishes missing from zero', () => {
    const days = [
      { amount: 10, date: '2026-01-02', percentagePoints: 0.5 },
      { amount: -10, date: '2026-01-05', percentagePoints: -0.25 }
    ];

    expect(
      aggregatePnlCalendarDays({
        days,
        startDate: '2026-01-01',
        endDate: '2026-01-04'
      })
    ).toEqual({
      amount: 10,
      startDate: '2026-01-01',
      endDate: '2026-01-04',
      percentagePoints: 0.5
    });

    expect(
      aggregatePnlCalendarDays({
        days,
        startDate: '2026-01-02',
        endDate: '2026-01-05'
      })
    ).toEqual({
      amount: 0,
      startDate: '2026-01-02',
      endDate: '2026-01-05',
      percentagePoints: 0.25
    });

    expect(
      aggregatePnlCalendarDays({
        days,
        startDate: '2026-02-01',
        endDate: '2026-02-28'
      }).amount
    ).toBeUndefined();
  });

  it('clips weeks crossing month boundaries without changing the month total', () => {
    const days = [
      { date: '2026-09-30', amount: 200, percentagePoints: 2 },
      { date: '2026-10-01', amount: 10, percentagePoints: 0.1 },
      { date: '2026-10-04', amount: -2, percentagePoints: -0.02 },
      { date: '2026-10-05', amount: 3, percentagePoints: 0.03 },
      { date: '2026-10-31', amount: 5, percentagePoints: 0.05 },
      { date: '2026-11-01', amount: 100, percentagePoints: 1 }
    ];
    const weeks = Array.from({ length: 5 }, (_, index) =>
      aggregatePnlCalendarWeekInMonth({
        days,
        monthStart: '2026-10-01',
        monthEnd: '2026-10-31',
        weekStart: addCalendarDays('2026-09-28', index * 7)
      })
    );
    const october = aggregatePnlCalendarDays({
      days,
      startDate: '2026-10-01',
      endDate: '2026-10-31'
    });

    expect(weeks[0]).toEqual({
      amount: 8,
      percentagePoints: 0.08,
      startDate: '2026-10-01',
      endDate: '2026-10-04'
    });
    expect(weeks[4].amount).toBe(5);
    expect(weeks.reduce((sum, week) => sum + (week.amount ?? 0), 0)).toBe(
      october.amount
    );
  });

  it('never approximates a financial return from the opening portfolio value', () => {
    const days = getPnlCalendarDays([
      {
        date: '2026-01-01',
        netPerformanceWithCurrencyEffect: 100,
        valueWithCurrencyEffect: 1000
      },
      {
        date: '2026-01-02',
        netPerformanceWithCurrencyEffect: 120,
        valueWithCurrencyEffect: 1200
      },
      {
        date: '2026-01-03',
        netPerformanceWithCurrencyEffect: 90,
        valueWithCurrencyEffect: 1150
      }
    ]);
    const period = aggregatePnlCalendarDays({
      days,
      startDate: '2026-01-02',
      endDate: '2026-01-03'
    });
    expect(period.amount).toBe(-10);
    expect('percentage' in period).toBe(false);
  });

  it('preserves zero monetary PnL with a deposit', () => {
    const days = getPnlCalendarDays([
      {
        date: '2026-03-10',
        netPerformanceWithCurrencyEffect: 25,
        valueWithCurrencyEffect: 1000
      },
      {
        date: '2026-03-11',
        netPerformanceWithCurrencyEffect: 25,
        valueWithCurrencyEffect: 11000
      }
    ]);
    expect(
      aggregatePnlCalendarDays({
        days,
        startDate: '2026-03-11',
        endDate: '2026-03-11'
      }).amount
    ).toBe(0);
  });

  it('handles a rolling 30-day interval across years', () => {
    expect(addCalendarDays('2026-01-13', -29)).toBe('2025-12-15');
    expect(addCalendarDays('2026-10-13', -29)).toBe('2026-09-14');
  });

  it('handles Mondays, Sundays, leap days and calendar-year boundaries', () => {
    expect(getMonday('2026-01-01')).toBe('2025-12-29');
    expect(getMonday('2026-01-04')).toBe('2025-12-29');
    expect(getMonday('2026-01-05')).toBe('2026-01-05');
    expect(addCalendarDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(addCalendarDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('never attributes a multi-day cumulative change to a single day', () => {
    const days = getPnlCalendarDays([
      { date: '2026-01-02', netPerformanceWithCurrencyEffect: 10 },
      { date: '2026-01-05', netPerformanceWithCurrencyEffect: 40 },
      { date: '2026-01-06', netPerformanceWithCurrencyEffect: 45 }
    ]);
    expect(days).toEqual([
      { amount: 5, date: '2026-01-06', percentagePoints: undefined }
    ]);
  });

  it('accepts contiguous dates across a leap day and a year boundary', () => {
    const days = getPnlCalendarDays([
      { date: '2024-02-28', netPerformanceWithCurrencyEffect: 1 },
      { date: '2024-02-29', netPerformanceWithCurrencyEffect: 3 },
      { date: '2024-03-01', netPerformanceWithCurrencyEffect: 6 },
      { date: '2024-12-31', netPerformanceWithCurrencyEffect: 20 },
      { date: '2025-01-01', netPerformanceWithCurrencyEffect: 24 }
    ]);
    expect(days.map(({ date, amount }) => ({ date, amount }))).toEqual([
      { date: '2024-02-29', amount: 2 },
      { date: '2024-03-01', amount: 3 },
      { date: '2025-01-01', amount: 4 }
    ]);
  });

  it('hides incomplete weekly and monthly monetary totals, rather than reporting partial sums', () => {
    const days = [
      { date: '2026-01-02', amount: 10 },
      { date: '2026-01-04', amount: 20 }
    ];
    const result = aggregatePnlCalendarDays({
      days,
      startDate: '2026-01-02',
      endDate: '2026-01-04',
      requireComplete: true,
      asOfDate: '2026-01-04'
    });
    expect(result.amount).toBeUndefined();
    // The legacy aggregate remains useful for explicitly partial sums.
    expect(
      aggregatePnlCalendarDays({
        days,
        startDate: '2026-01-02',
        endDate: '2026-01-04'
      }).amount
    ).toBe(30);
  });

  it('preserves a real zero and does not require dates in the future', () => {
    const days = [
      { date: '2026-10-12', amount: 0 },
      { date: '2026-10-13', amount: 0 }
    ];
    expect(
      aggregatePnlCalendarDays({
        days,
        startDate: '2026-10-12',
        endDate: '2026-10-31',
        requireComplete: true,
        asOfDate: '2026-10-13'
      }).amount
    ).toBe(0);
    expect(
      aggregatePnlCalendarDays({
        days,
        startDate: '2026-10-14',
        endDate: '2026-10-31',
        requireComplete: true,
        asOfDate: '2026-10-13'
      }).amount
    ).toBeUndefined();
  });

  it('treats absent or undefined monetary observations as incomplete', () => {
    expect(
      aggregatePnlCalendarDays({
        days: [
          { date: '2026-01-01', amount: 2 },
          { date: '2026-01-02', percentagePoints: 0.1 }
        ],
        startDate: '2026-01-01',
        endDate: '2026-01-02',
        requireComplete: true,
        asOfDate: '2026-01-02'
      }).amount
    ).toBeUndefined();
  });

  it('uses the local calendar day instead of a UTC date', () => {
    const now = new Date(2026, 9, 13, 0, 15);
    expect(getLocalTodayKey(now)).toBe('2026-10-13');
  });

  it('does not mistake pre-inception dates for gaps, but rejects later missing days', () => {
    const days = [
      { date: '2026-01-15', amount: 0 },
      { date: '2026-01-16', amount: 4 },
      { date: '2026-01-17', amount: -1 }
    ];
    expect(
      aggregatePnlCalendarDays({
        days,
        startDate: '2026-01-01',
        endDate: '2026-01-17',
        requireComplete: true,
        asOfDate: '2026-01-17',
        firstHistoricalDate: '2026-01-15'
      }).amount
    ).toBe(3);
    expect(
      aggregatePnlCalendarDays({
        days: [...days, { date: '2026-01-19', amount: 2 }],
        startDate: '2026-01-01',
        endDate: '2026-01-19',
        requireComplete: true,
        asOfDate: '2026-01-19',
        firstHistoricalDate: '2026-01-15'
      }).amount
    ).toBeUndefined();
    // A missing day at the start is still a gap when earlier history exists.
    expect(
      aggregatePnlCalendarDays({
        days: [{ date: '2025-12-31', amount: 1 }, ...days],
        startDate: '2026-01-01',
        endDate: '2026-01-17',
        requireComplete: true,
        asOfDate: '2026-01-17'
      }).amount
    ).toBeUndefined();
  });

  it('does not report a complete total before any observed monetary day', () => {
    expect(
      aggregatePnlCalendarDays({
        days: [],
        startDate: '2026-01-01',
        endDate: '2026-01-31',
        requireComplete: true,
        asOfDate: '2026-01-31'
      }).amount
    ).toBeUndefined();
  });

  it('does not infer inception from the first PnL point alone', () => {
    expect(
      aggregatePnlCalendarDays({
        days: [{ date: '2026-01-15', amount: 10 }],
        startDate: '2026-01-01',
        endDate: '2026-01-15',
        requireComplete: true,
        asOfDate: '2026-01-15'
      }).amount
    ).toBeUndefined();
  });

  it('handles a synthetic first month with purchases on October 9 and 18', () => {
    // Entirely artificial chart: the first activity occurs on October 9.
    // The second purchase adds capital but does not generate profit itself.
    const chart = [
      {
        date: '2026-10-09',
        netPerformanceWithCurrencyEffect: 0,
        valueWithCurrencyEffect: 1000
      },
      ...Array.from({ length: 14 }, (_, index) => {
        const day = index + 10;
        const netPerformance =
          day === 18 ? -40 : day === 23 ? -45 : -5 * (day - 9);
        return {
          date: `2026-10-${String(day).padStart(2, '0')}`,
          netPerformanceWithCurrencyEffect: netPerformance,
          valueWithCurrencyEffect: (day >= 18 ? 2000 : 1000) + netPerformance
        };
      })
    ];
    const days = getPnlCalendarDays(chart);
    const month = aggregatePnlCalendarDays({
      days,
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      requireComplete: true,
      firstHistoricalDate: '2026-10-09',
      asOfDate: '2026-10-23'
    });

    expect(days[0]).toMatchObject({ date: '2026-10-10', amount: -5 });
    expect(days.find(({ date }) => date === '2026-10-18')?.amount).toBe(0);
    expect(month.amount).toBe(-45);
    expect(days.some(({ date }) => date < '2026-10-09')).toBe(false);
  });

  it('rejects a missing day after synthetic inception, even with two purchases', () => {
    const days = Array.from({ length: 14 }, (_, index) => ({
      date: `2026-10-${String(index + 10).padStart(2, '0')}`,
      amount: index === 8 ? 0 : -2
    }));
    const month = aggregatePnlCalendarDays({
      days: days.filter(({ date }) => date !== '2026-10-14'),
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      firstHistoricalDate: '2026-10-09',
      requireComplete: true,
      asOfDate: '2026-10-23'
    });
    expect(month.amount).toBeUndefined();
  });
});
