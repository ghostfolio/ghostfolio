import { shouldEnableUpdateAccountBalance } from './create-or-update-activity-dialog.helper';

describe('shouldEnableUpdateAccountBalance', () => {
  describe('BUY type', () => {
    it('should enable regardless of date', () => {
      expect(
        shouldEnableUpdateAccountBalance({
          accountId: 'account-1',
          dataSource: 'YAHOO',
          type: 'BUY'
        })
      ).toBe(true);
    });

    it('should disable when dataSource is MANUAL (transitional from VALUABLE)', () => {
      expect(
        shouldEnableUpdateAccountBalance({
          accountId: 'account-1',
          dataSource: 'MANUAL',
          type: 'BUY'
        })
      ).toBe(false);
    });
  });

  describe('SELL type', () => {
    it('should enable', () => {
      expect(
        shouldEnableUpdateAccountBalance({
          accountId: 'account-1',
          dataSource: 'YAHOO',
          type: 'SELL'
        })
      ).toBe(true);
    });
  });

  describe('DIVIDEND type', () => {
    it('should enable', () => {
      expect(
        shouldEnableUpdateAccountBalance({
          accountId: 'account-1',
          dataSource: 'YAHOO',
          type: 'DIVIDEND'
        })
      ).toBe(true);
    });
  });

  describe('FEE type', () => {
    it('should enable when accountId is set', () => {
      expect(
        shouldEnableUpdateAccountBalance({
          accountId: 'account-1',
          dataSource: 'MANUAL',
          type: 'FEE'
        })
      ).toBe(true);
    });

    it('should disable when accountId is empty', () => {
      expect(
        shouldEnableUpdateAccountBalance({
          accountId: null,
          dataSource: 'MANUAL',
          type: 'FEE'
        })
      ).toBe(false);
    });
  });

  describe('INTEREST type', () => {
    it('should enable when accountId is set', () => {
      expect(
        shouldEnableUpdateAccountBalance({
          accountId: 'account-1',
          dataSource: 'MANUAL',
          type: 'INTEREST'
        })
      ).toBe(true);
    });

    it('should disable when accountId is empty', () => {
      expect(
        shouldEnableUpdateAccountBalance({
          accountId: null,
          dataSource: 'MANUAL',
          type: 'INTEREST'
        })
      ).toBe(false);
    });
  });

  describe('VALUABLE type', () => {
    it('should always disable', () => {
      expect(
        shouldEnableUpdateAccountBalance({
          accountId: 'account-1',
          dataSource: 'MANUAL',
          type: 'VALUABLE'
        })
      ).toBe(false);
    });
  });

  describe('LIABILITY type', () => {
    it('should always disable', () => {
      expect(
        shouldEnableUpdateAccountBalance({
          accountId: 'account-1',
          dataSource: 'MANUAL',
          type: 'LIABILITY'
        })
      ).toBe(false);
    });
  });
});
