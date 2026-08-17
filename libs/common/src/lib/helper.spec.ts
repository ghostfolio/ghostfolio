import {
  TAG_ID_EMERGENCY_FUND,
  TAG_ID_EXCLUDE_FROM_ANALYSIS
} from '@ghostfolio/common/config';
import {
  extractNumberFromString,
  getCountryCodeFromCurrency,
  getNumberFormatGroup,
  getStringOrNull,
  getStringOrUndefined,
  isAccountExcluded,
  isCurrency,
  isCurrencySymbol,
  isSplitRatio,
  isValidCustomAssetProfileSymbol,
  resolveUserSettings
} from '@ghostfolio/common/helper';
import { UserSettings } from '@ghostfolio/common/interfaces';

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

  describe('Get country code from currency', () => {
    it('ISO 4217 currency code', () => {
      expect(getCountryCodeFromCurrency('CHF')).toEqual('CH');
      expect(getCountryCodeFromCurrency('USD')).toEqual('US');
    });

    it('Currency of the European Union', () => {
      expect(getCountryCodeFromCurrency('EUR')).toEqual('EU');
    });

    it('Derived currency', () => {
      expect(getCountryCodeFromCurrency('GBp')).toEqual('GB');
    });

    it('Supranational currency', () => {
      expect(getCountryCodeFromCurrency('XAU')).toEqual('');
      expect(getCountryCodeFromCurrency('XOF')).toEqual('');
    });

    it('Empty currency', () => {
      expect(getCountryCodeFromCurrency('')).toEqual('');
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

  describe('Get string or null', () => {
    it('String', () => {
      expect(getStringOrNull('https://ghostfol.io')).toEqual(
        'https://ghostfol.io'
      );
    });

    it('String (with spaces)', () => {
      expect(getStringOrNull(' https://ghostfol.io ')).toEqual(
        'https://ghostfol.io'
      );
    });

    it('Empty string', () => {
      expect(getStringOrNull('')).toEqual(null);
    });

    it('Blank string', () => {
      expect(getStringOrNull('   ')).toEqual(null);
    });

    it('Null', () => {
      expect(getStringOrNull(null)).toEqual(null);
    });

    it('Undefined', () => {
      expect(getStringOrNull(undefined)).toEqual(null);
    });
  });

  describe('Get string or undefined', () => {
    it('String', () => {
      expect(getStringOrUndefined('de-DE')).toEqual('de-DE');
    });

    it('String (with spaces)', () => {
      expect(getStringOrUndefined(' de-DE ')).toEqual('de-DE');
    });

    it('Empty string', () => {
      expect(getStringOrUndefined('')).toEqual(undefined);
    });

    it('Blank string', () => {
      expect(getStringOrUndefined('   ')).toEqual(undefined);
    });

    it('Null', () => {
      expect(getStringOrUndefined(null)).toEqual(undefined);
    });

    it('Undefined', () => {
      expect(getStringOrUndefined(undefined)).toEqual(undefined);
    });
  });

  describe('Is account excluded', () => {
    it('Account with Exclude from Analysis tag', () => {
      expect(
        isAccountExcluded({ tags: [{ id: TAG_ID_EXCLUDE_FROM_ANALYSIS }] })
      ).toEqual(true);
    });

    it('Account with another tag', () => {
      expect(
        isAccountExcluded({ tags: [{ id: TAG_ID_EMERGENCY_FUND }] })
      ).toEqual(false);
    });

    it('Account without tags', () => {
      expect(isAccountExcluded({ tags: [] })).toEqual(false);
    });

    it('Undefined account', () => {
      expect(isAccountExcluded(undefined)).toEqual(false);
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

  describe('Is split ratio', () => {
    it('Forward split', () => {
      expect(isSplitRatio({ denominator: 1, numerator: 2 })).toEqual(true);
      expect(isSplitRatio({ denominator: 1, numerator: 4 })).toEqual(true);
      expect(isSplitRatio({ denominator: 2, numerator: 3 })).toEqual(true);
    });

    it('Reverse split', () => {
      expect(isSplitRatio({ denominator: 10, numerator: 1 })).toEqual(true);
      expect(isSplitRatio({ denominator: 3, numerator: 1 })).toEqual(true);
    });

    it('Ratio without effect', () => {
      expect(isSplitRatio({ denominator: 1, numerator: 1 })).toEqual(false);
      expect(isSplitRatio({ denominator: 3, numerator: 3 })).toEqual(false);
    });

    it('Zero or negative ratio', () => {
      expect(isSplitRatio({ denominator: 1, numerator: 0 })).toEqual(false);
      expect(isSplitRatio({ denominator: 0, numerator: 1 })).toEqual(false);
      expect(isSplitRatio({ denominator: 1, numerator: -2 })).toEqual(false);
      expect(isSplitRatio({ denominator: -2, numerator: 1 })).toEqual(false);
    });

    it('Non-integer ratio', () => {
      expect(isSplitRatio({ denominator: 1, numerator: 1.5 })).toEqual(false);
      expect(isSplitRatio({ denominator: 2.5, numerator: 1 })).toEqual(false);
      expect(isSplitRatio({ denominator: 1, numerator: Number.NaN })).toEqual(
        false
      );
      expect(
        isSplitRatio({ denominator: 1, numerator: Number.POSITIVE_INFINITY })
      ).toEqual(false);
    });

    it('Missing ratio', () => {
      expect(
        isSplitRatio({ denominator: undefined, numerator: undefined })
      ).toEqual(false);
      expect(isSplitRatio({ denominator: null, numerator: null })).toEqual(
        false
      );
    });
  });

  describe('Is valid custom asset profile symbol', () => {
    it('Empty symbol', () => {
      expect(isValidCustomAssetProfileSymbol('')).toEqual(false);
    });

    it('Free-text symbol', () => {
      expect(isValidCustomAssetProfileSymbol('Penthouse Apartment')).toEqual(
        false
      );
    });

    it('Stock symbol', () => {
      expect(isValidCustomAssetProfileSymbol('AAPL')).toEqual(false);
    });

    it('Symbol with Ghostfolio prefix', () => {
      expect(isValidCustomAssetProfileSymbol('GF_PENTHOUSE_APARTMENT')).toEqual(
        true
      );
    });

    it('UUID', () => {
      expect(
        isValidCustomAssetProfileSymbol('7e91b7d4-1430-4212-8380-289a06c9bbc1')
      ).toEqual(true);
    });
  });

  describe('Resolve user settings', () => {
    const userSettings: UserSettings = {
      baseCurrency: 'CHF',
      colorScheme: 'DARK',
      dateRange: '1y',
      emergencyFund: 10000,
      language: 'de',
      locale: 'de-CH',
      savingsRate: 500,
      viewMode: 'DEFAULT'
    };

    const impersonationUserSettings: UserSettings = {
      baseCurrency: 'USD',
      colorScheme: 'LIGHT',
      dateRange: 'ytd',
      emergencyFund: 25000,
      language: 'en',
      locale: 'en-US',
      savingsRate: 1000,
      viewMode: 'ZEN'
    };

    it('Without impersonation', () => {
      expect(
        resolveUserSettings({
          userSettings,
          impersonationUserSettings: undefined
        })
      ).toEqual(userSettings);
    });

    it('Portfolio settings follow the impersonated user', () => {
      const { baseCurrency, emergencyFund, savingsRate } = resolveUserSettings({
        impersonationUserSettings,
        userSettings
      });

      expect({ baseCurrency, emergencyFund, savingsRate }).toEqual({
        baseCurrency: 'USD',
        emergencyFund: 25000,
        savingsRate: 1000
      });
    });

    it('Presentation settings stay with the authenticated user', () => {
      const { colorScheme, dateRange, language, locale, viewMode } =
        resolveUserSettings({ impersonationUserSettings, userSettings });

      expect({ colorScheme, dateRange, language, locale, viewMode }).toEqual({
        colorScheme: 'DARK',
        dateRange: '1y',
        language: 'de',
        locale: 'de-CH',
        viewMode: 'DEFAULT'
      });
    });

    it('Benchmark stays with the authenticated user', () => {
      // The benchmark is a comparison of the person looking at the screen and
      // is gated by their subscription, so it must not follow the impersonated
      // user
      const { benchmark } = resolveUserSettings({
        impersonationUserSettings: {
          benchmark: '82fd8dcc-4a0e-4dd0-b6cb-7b8a4b03e6b1'
        },
        userSettings: { benchmark: '1e5a0e6a-1b8b-4d0e-9f0a-4c2b3d5e6f7a' }
      });

      expect(benchmark).toEqual('1e5a0e6a-1b8b-4d0e-9f0a-4c2b3d5e6f7a');
    });

    it('Filters stay with the authenticated user', () => {
      // The filters are always written back to the authenticated user, so
      // reading them from the impersonated user would overwrite them
      const { 'filters.accounts': filtersAccounts } = resolveUserSettings({
        impersonationUserSettings: {
          'filters.accounts': ['3b3c2b5d-5a4f-4b0a-9d4f-9b1f5e6a7c8d']
        },
        userSettings: {
          'filters.accounts': ['0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d']
        }
      });

      expect(filtersAccounts).toEqual(['0a1b2c3d-4e5f-6a7b-8c9d-0e1f2a3b4c5d']);
    });

    it('Presentation settings unset for the authenticated user do not leak', () => {
      // An unset presentation setting must not fall back to the impersonated
      // user, otherwise their appearance and language apply to the
      // authenticated user
      const { colorScheme, language, locale } = resolveUserSettings({
        impersonationUserSettings,
        userSettings: { baseCurrency: 'CHF' }
      });

      expect(colorScheme).toBeUndefined();
      expect(language).toBeUndefined();
      expect(locale).toBeUndefined();
    });

    it('Unknown settings default to the impersonated user', () => {
      // A setting which is not classified as presentation must not leak from
      // the authenticated user into the impersonated portfolio
      expect(
        resolveUserSettings({
          impersonationUserSettings: { annualInterestRate: 5 },
          userSettings: { annualInterestRate: 3 }
        }).annualInterestRate
      ).toEqual(5);
    });

    it('Impersonated user without settings', () => {
      expect(
        resolveUserSettings({
          userSettings,
          impersonationUserSettings: {}
        })
      ).toEqual({
        colorScheme: 'DARK',
        dateRange: '1y',
        language: 'de',
        locale: 'de-CH',
        viewMode: 'DEFAULT'
      });
    });
  });
});
