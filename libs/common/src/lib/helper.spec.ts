import {
  extractNumberFromString,
  getNumberFormatGroup
} from '@ghostfolio/common/helper';

describe('Helper', () => {
  describe('Extract number from string', () => {
    it('Get decimal number', () => {
      expect(extractNumberFromString({ value: '999.99' })).toEqual(999.99);
    });

    it('Get decimal number (with spaces)', () => {
      expect(extractNumberFromString({ value: ' 999.99 ' })).toEqual(999.99);
    });

    it('Get decimal number (with currency)', () => {
      expect(extractNumberFromString({ value: '999.99 CHF' })).toEqual(999.99);
    });

    it('Get decimal number (comma notation)', () => {
      expect(
        extractNumberFromString({ locale: 'de-DE', value: '999,99' })
      ).toEqual(999.99);
    });

    it('Get decimal number with group (dot notation)', () => {
      expect(
        extractNumberFromString({ locale: 'de-CH', value: '99’999.99' })
      ).toEqual(99999.99);
    });

    it('Get decimal number with group (comma notation)', () => {
      expect(
        extractNumberFromString({ locale: 'de-DE', value: '99.999,99' })
      ).toEqual(99999.99);
    });

    it('Not a number', () => {
      expect(extractNumberFromString({ value: 'X' })).toEqual(NaN);
    });
  });

  describe('Get Number Format Group', () => {
    it('Get en-US number format group', () => {
      expect(getNumberFormatGroup('en-US')).toEqual(',');
    });

    it('Get es-ES number format group', () => {
      expect(getNumberFormatGroup('es-ES')).toEqual('.');
    });
  });
});
