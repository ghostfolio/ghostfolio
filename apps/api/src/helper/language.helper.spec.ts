import { DEFAULT_LANGUAGE_CODE } from '@ghostfolio/common/config';

import {
  getLanguageCodeFromHeader,
  getSupportedLanguageCode
} from './language.helper';

describe('getLanguageCodeFromHeader', () => {
  it('should get the primary language code', () => {
    expect(getLanguageCodeFromHeader('de-CH,de;q=0.9,en;q=0.8')).toEqual('de');
  });

  it('should use the default language code if the header is missing', () => {
    expect(getLanguageCodeFromHeader()).toEqual(DEFAULT_LANGUAGE_CODE);
  });

  it('should use the default language code if the language is not supported', () => {
    expect(getLanguageCodeFromHeader('xx')).toEqual(DEFAULT_LANGUAGE_CODE);
  });
});

describe('getSupportedLanguageCode', () => {
  it('should return a supported language code', () => {
    expect(getSupportedLanguageCode('de')).toEqual('de');
  });

  it('should ignore the region subtag', () => {
    expect(getSupportedLanguageCode('de-CH')).toEqual('de');
  });

  it('should ignore the case', () => {
    expect(getSupportedLanguageCode('DE')).toEqual('de');
  });

  it('should use the default language code if the language is not supported', () => {
    expect(getSupportedLanguageCode()).toEqual(DEFAULT_LANGUAGE_CODE);
    expect(getSupportedLanguageCode('')).toEqual(DEFAULT_LANGUAGE_CODE);
    expect(getSupportedLanguageCode('xx')).toEqual(DEFAULT_LANGUAGE_CODE);
  });
});
