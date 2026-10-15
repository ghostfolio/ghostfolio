import {
  getWhereAccountBalanceNotInFuture,
  isAccountBalanceInFuture
} from './account.helper';

// A user in a time zone ahead of the instance is already on the next day at
// this moment. The expected limit is a moment in UTC, hence this suite must
// give the same result with the instance in any time zone. Set TEST_TZ to run
// it with the instance in another time zone.
const SYSTEM_TIME = new Date('2026-09-03T23:30:00.000Z');
const START_OF_UTC_DATE_OF_TOMORROW = new Date('2026-09-04T00:00:00.000Z');

describe('account.helper', () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(SYSTEM_TIME);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('getWhereAccountBalanceNotInFuture', () => {
    it('should limit the date to the start of the UTC date of tomorrow', () => {
      expect(getWhereAccountBalanceNotInFuture()).toEqual({
        date: { lte: START_OF_UTC_DATE_OF_TOMORROW }
      });
    });
  });

  describe('isAccountBalanceInFuture', () => {
    it('should accept the account balance of the current day', () => {
      expect(
        isAccountBalanceInFuture({ date: new Date('2026-09-03T00:00:00.000Z') })
      ).toBe(false);
    });

    it('should accept the account balance of a user in a time zone ahead of the instance', () => {
      expect(
        isAccountBalanceInFuture({ date: START_OF_UTC_DATE_OF_TOMORROW })
      ).toBe(false);
    });

    it('should reject an account balance after the start of the UTC date of tomorrow', () => {
      expect(
        isAccountBalanceInFuture({ date: new Date('2026-09-04T00:00:00.001Z') })
      ).toBe(true);
    });

    it('should reject an account balance of the day after tomorrow', () => {
      expect(
        isAccountBalanceInFuture({ date: new Date('2026-09-05T00:00:00.000Z') })
      ).toBe(true);
    });
  });
});
