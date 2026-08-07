import { Big } from 'big.js';
import { format } from 'date-fns';

import {
  getAnnualizedPerformancePercent,
  getIntervalFromDateRange
} from './calculation-helper';
import { DATE_FORMAT } from './helper';

describe('CalculationHelper', () => {
  describe('interval from date range', () => {
    it('Get interval of a calendar year', async () => {
      const { endDate, startDate } = getIntervalFromDateRange({
        dateRange: '2024'
      });

      // The boundaries are expressed in the local time zone, therefore the
      // calendar days must hold independently of the time zone the tests run in
      expect(format(startDate, DATE_FORMAT)).toEqual('2023-12-31');
      expect(format(endDate, DATE_FORMAT)).toEqual('2024-12-31');

      // The start date is exclusive, hence the first instant of the year is
      // part of the interval
      expect(startDate.getTime()).toEqual(new Date(2024, 0, 1).getTime() - 1);
    });
  });

  describe('annualized performance percentage', () => {
    it('Get annualized performance', async () => {
      expect(
        getAnnualizedPerformancePercent({
          daysInMarket: NaN, // differenceInDays of date-fns returns NaN for the same day
          netPerformancePercentage: new Big(0)
        }).toNumber()
      ).toEqual(0);

      expect(
        getAnnualizedPerformancePercent({
          daysInMarket: 0,
          netPerformancePercentage: new Big(0)
        }).toNumber()
      ).toEqual(0);

      /**
       * Source: https://www.readyratios.com/reference/analysis/annualized_rate.html
       */
      expect(
        getAnnualizedPerformancePercent({
          daysInMarket: 65, // < 1 year
          netPerformancePercentage: new Big(0.1025)
        }).toNumber()
      ).toBeCloseTo(0.729705);

      expect(
        getAnnualizedPerformancePercent({
          daysInMarket: 365, // 1 year
          netPerformancePercentage: new Big(0.05)
        }).toNumber()
      ).toBeCloseTo(0.05);

      /**
       * Source: https://www.investopedia.com/terms/a/annualized-total-return.asp#annualized-return-formula-and-calculation
       */
      expect(
        getAnnualizedPerformancePercent({
          daysInMarket: 575, // > 1 year
          netPerformancePercentage: new Big(0.2374)
        }).toNumber()
      ).toBeCloseTo(0.145);
    });
  });
});
