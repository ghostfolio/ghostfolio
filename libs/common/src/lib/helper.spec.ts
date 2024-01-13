import { extractNumberFromString } from '@ghostfolio/common/helper';

describe('Helper', () => {
  describe('Extract number from string', () => {
    it('Get decimal number', async () => {
      expect(extractNumberFromString({ value: '999.99' })).toEqual(999.99);
    });

    it('Get decimal number (with spaces)', async () => {
      expect(extractNumberFromString({ value: ' 999.99 ' })).toEqual(999.99);
    });

    it('Get decimal number (with currency)', async () => {
      expect(extractNumberFromString({ value: '999.99 CHF' })).toEqual(999.99);
    });

    it('Get decimal number (comma notation)', async () => {
      expect(
        extractNumberFromString({ locale: 'de-DE', value: '999,99' })
      ).toEqual(999.99);
    });

    it('Get decimal number with group (dot notation)', async () => {
      expect(
        extractNumberFromString({ locale: 'de-CH', value: '99’999.99' })
      ).toEqual(99999.99);
    });

    it('Get decimal number with group (comma notation)', async () => {
      expect(
        extractNumberFromString({ locale: 'de-DE', value: '99.999,99' })
      ).toEqual(99999.99);
    });

    it('Not a number', async () => {
      expect(extractNumberFromString({ value: 'X' })).toEqual(NaN);
    });
  });
});
