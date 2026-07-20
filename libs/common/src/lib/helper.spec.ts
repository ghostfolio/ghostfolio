import {
  extractNumberFromString,
  getNumberFormatGroup,
  isCurrency,
  isCurrencySymbol
} from '@ghostfolio/common/helper';

describe('Helper', () => {
  describe('Extract number from string', () => {
    it('Get decimal number', () => {
      expect(extractNumberFromString({ value: '999.99' })).toEqual(999.99);
    });

    it('Get negative decimal number', () => {
      expect(extractNumberFromString({ value: '-999.99' })).toEqual(-999.99);
    });

    it('Get decimal number (with spaces)', () => {
      expect(extractNumberFromString({ value: ' 999.99 ' })).toEqual(999.99);
    });

    it('Get decimal number (with currency)', () => {
      expect(extractNumberFromString({ value: '999.99 CHF' })).toEqual(999.99);
    });

    it('Get negative decimal number (with currency)', () => {
      expect(extractNumberFromString({ value: '-999.99 CHF' })).toEqual(
        -999.99
      );
    });

    it('Get decimal number (comma notation)', () => {
      expect(
        extractNumberFromString({ locale: 'de-DE', value: '999,99' })
      ).toEqual(999.99);
    });

    it('Get decimal number with group (dot notation)', () => {
      expect(
        extractNumberFromString({ locale: 'de-CH', value: `99'999.99` })
      ).toEqual(99999.99);
    });

    it('Get decimal number with group (comma notation)', () => {
      expect(
        extractNumberFromString({ locale: 'de-DE', value: '99.999,99' })
      ).toEqual(99999.99);
    });

    it('Get negative decimal number with group (comma notation)', () => {
      expect(
        extractNumberFromString({ locale: 'de-DE', value: '-99.999,99' })
      ).toEqual(-99999.99);
    });

    it('Get decimal number (comma notation) for locale where currency is not grouped by default', () => {
      expect(
        extractNumberFromString({ locale: 'es-ES', value: '999,99' })
      ).toEqual(999.99);
    });

    it('Get decimal number (with hyphenated text)', () => {
      expect(extractNumberFromString({ value: 'BRK-B 425.30' })).toEqual(425.3);
    });

    it('Not a number', () => {
      expect(extractNumberFromString({ value: 'X' })).toEqual(NaN);
    });
  });

  describe('Get number format group', () => {
    let languageGetter: jest.SpyInstance<string, [], any>;

    beforeEach(() => {
      languageGetter = jest.spyOn(window.navigator, 'language', 'get');
    });

    it('Get de-CH number format group', () => {
      expect(getNumberFormatGroup('de-CH')).toEqual(`'`);
    });

    it('Get de-CH number format group when it is default', () => {
      languageGetter.mockReturnValue('de-CH');
      expect(getNumberFormatGroup()).toEqual(`'`);
    });

    it('Get de-DE number format group', () => {
      expect(getNumberFormatGroup('de-DE')).toEqual('.');
    });

    it('Get de-DE number format group when it is default', () => {
      languageGetter.mockReturnValue('de-DE');
      expect(getNumberFormatGroup()).toEqual('.');
    });

    it('Get en-GB number format group', () => {
      expect(getNumberFormatGroup('en-GB')).toEqual(',');
    });

    it('Get en-GB number format group when it is default', () => {
      languageGetter.mockReturnValue('en-GB');
      expect(getNumberFormatGroup()).toEqual(',');
    });

    it('Get en-US number format group', () => {
      expect(getNumberFormatGroup('en-US')).toEqual(',');
    });

    it('Get en-US number format group when it is default', () => {
      languageGetter.mockReturnValue('en-US');
      expect(getNumberFormatGroup()).toEqual(',');
    });

    it('Get es-ES number format group', () => {
      expect(getNumberFormatGroup('es-ES')).toEqual('.');
    });

    it('Get es-ES number format group when it is default', () => {
      languageGetter.mockReturnValue('es-ES');
      expect(getNumberFormatGroup()).toEqual('.');
    });

    it('Get ru-RU number format group', () => {
      expect(getNumberFormatGroup('ru-RU')).toEqual(' ');
    });

    it('Get ru-RU number format group when it is default', () => {
      languageGetter.mockReturnValue('ru-RU');
      expect(getNumberFormatGroup()).toEqual(' ');
    });

    it('Get zh-CN number format group', () => {
      expect(getNumberFormatGroup('zh-CN')).toEqual(',');
    });

    it('Get zh-CN number format group when it is default', () => {
      languageGetter.mockReturnValue('zh-CN');
      expect(getNumberFormatGroup()).toEqual(',');
    });
  });

  describe('Is currency', () => {
    it('ISO 4217 currency code', () => {
      expect(isCurrency('USD')).toEqual(true);
    });

    it('Derived currency', () => {
      expect(isCurrency('GBp')).toEqual(true);
    });

    it('Non-currency', () => {
      expect(isCurrency('AAPL')).toEqual(false);
    });

    it('Empty currency', () => {
      expect(isCurrency('')).toEqual(false);
    });
  });

  describe('Is currency symbol', () => {
    it('Currency symbol (default currency as base)', () => {
      expect(isCurrencySymbol('USDCHF')).toEqual(true);
      expect(isCurrencySymbol('USDZAR')).toEqual(true);
    });

    it('Currency symbol (default currency as quote)', () => {
      expect(isCurrencySymbol('EURUSD')).toEqual(true);
    });

    it('Currency symbol (derived currency)', () => {
      expect(isCurrencySymbol('USDGBp')).toEqual(true);
    });

    it('Stock symbol with currency-like prefix', () => {
      expect(isCurrencySymbol('ERNA.L')).toEqual(false);
    });

    it('Cryptocurrency symbol', () => {
      expect(isCurrencySymbol('BTCUSD')).toEqual(false);
    });

    it('Stock symbol', () => {
      expect(isCurrencySymbol('AAPL')).toEqual(false);
    });

    it('Symbol with non-currency suffix', () => {
      expect(isCurrencySymbol('USD.AX')).toEqual(false);
    });

    it('Plain currency code', () => {
      expect(isCurrencySymbol('USD')).toEqual(false);
    });

    it('Empty symbol', () => {
      expect(isCurrencySymbol('')).toEqual(false);
    });
  });
});
