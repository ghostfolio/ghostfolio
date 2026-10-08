import {
  DEFAULT_LANGUAGE_CODE,
  SUPPORTED_LANGUAGE_CODES
} from '@ghostfolio/common/config';

type SupportedLanguageCode = (typeof SUPPORTED_LANGUAGE_CODES)[number];

export function getLanguageCodeFromHeader(
  acceptLanguage?: string
): SupportedLanguageCode {
  return getSupportedLanguageCode(acceptLanguage?.split(',')[0]);
}

export function getSupportedLanguageCode(
  languageCode?: string
): SupportedLanguageCode {
  const languageCodeToUse = languageCode
    ?.split('-')[0]
    .toLowerCase() as SupportedLanguageCode;

  return SUPPORTED_LANGUAGE_CODES.includes(languageCodeToUse)
    ? languageCodeToUse
    : DEFAULT_LANGUAGE_CODE;
}
