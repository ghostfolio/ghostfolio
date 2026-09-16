import {
  DEFAULT_LANGUAGE_CODE,
  SUPPORTED_LANGUAGE_CODES
} from '@ghostfolio/common/config';

export function getLanguageCodeFromHeader(acceptLanguage?: string): string {
  const languageCode = acceptLanguage?.split(',')[0].split('-')[0];

  return getSupportedLanguageCode(languageCode);
}

export function getSupportedLanguageCode(languageCode?: string): string {
  return (SUPPORTED_LANGUAGE_CODES as readonly string[]).includes(languageCode)
    ? languageCode
    : DEFAULT_LANGUAGE_CODE;
}
