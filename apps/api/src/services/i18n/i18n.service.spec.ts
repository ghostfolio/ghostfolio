import { Logger } from '@nestjs/common';
import { readFileSync, readdirSync } from 'node:fs';

import { I18nService } from './i18n.service';

jest.mock('node:fs', () => {
  return {
    ...jest.requireActual('node:fs'),
    readFileSync: jest.fn(),
    readdirSync: jest.fn()
  };
});

const germanLocale = `
  <xliff>
    <trans-unit id="metaDescription.new">
      <source>New</source>
      <target state="new">New</target>
    </trans-unit>
    <trans-unit id="metaDescription.translated">
      <source>Translated</source>
      <target state="translated">Übersetzt</target>
    </trans-unit>
    <trans-unit id="routes.faq">
      <source>faq</source>
      <target state="translated">haeufig-gestellte-fragen</target>
    </trans-unit>
    <trans-unit id="routes.faq.selfHosting">
      <source>self-hosting</source>
      <target state="translated">selbst-hosting</target>
    </trans-unit>
  </xliff>
`;

describe('I18nService', () => {
  let i18nService: I18nService;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    (readdirSync as jest.Mock).mockReturnValue(['messages.de.xlf']);
    (readFileSync as jest.Mock).mockReturnValue(germanLocale);

    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();

    i18nService = new I18nService();
    i18nService.onModuleInit();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getTranslation', () => {
    it('returns a target with the state "new" by default', () => {
      expect(
        i18nService.getTranslation({
          id: 'metaDescription.new',
          languageCode: 'de'
        })
      ).toBe('New');
    });

    it('skips a target with the state "new" without a warning if skipUntranslated is true', () => {
      expect(
        i18nService.getTranslation({
          id: 'metaDescription.new',
          languageCode: 'de',
          skipUntranslated: true
        })
      ).toBe('');
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('returns a translated target if skipUntranslated is true', () => {
      expect(
        i18nService.getTranslation({
          id: 'metaDescription.translated',
          languageCode: 'de',
          skipUntranslated: true
        })
      ).toBe('Übersetzt');
    });

    it('logs a warning for an unknown id by default', () => {
      expect(
        i18nService.getTranslation({
          id: 'metaDescription.unknown',
          languageCode: 'de'
        })
      ).toBe('');
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('getLocalizedRouterLink', () => {
    it('localizes the tagged segments and keeps the other segments', () => {
      expect(
        i18nService.getLocalizedRouterLink({
          languageCode: 'de',
          routerLink: [
            '/:kebab-case@@routes.faq:faq',
            ':kebab-case@@routes.faq.selfHosting:self-hosting',
            'saas'
          ]
        })
      ).toEqual(['haeufig-gestellte-fragen', 'selbst-hosting', 'saas']);
    });
  });
});
