import { DEFAULT_LANGUAGE_CODE } from '@ghostfolio/common/config';

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

@Injectable()
export class I18nService implements OnModuleInit {
  private static readonly TRANSLATION_TAGGED_MESSAGE_REGEX =
    /:.*@@(?<id>[a-zA-Z0-9.]+):(?<message>.+)/;

  private readonly logger = new Logger(I18nService.name);

  private localesPath = join(__dirname, 'assets', 'locales');
  private translations: { [locale: string]: cheerio.CheerioAPI } = {};

  public onModuleInit() {
    this.loadFiles();
  }

  public getLocalizedRouterLink({
    languageCode,
    routerLink
  }: {
    languageCode: string;
    routerLink: string[];
  }): string[] {
    return routerLink.map((link) => {
      const match = link.match(I18nService.TRANSLATION_TAGGED_MESSAGE_REGEX);

      const segment = match
        ? (this.getTranslation({
            languageCode,
            id: match.groups.id
          }) ?? match.groups.message)
        : link;

      return segment.replace(/^\/+|\/+$/, '');
    });
  }

  public getTranslation({
    id,
    languageCode,
    placeholders,
    skipUntranslated = false
  }: {
    id: string;
    languageCode: string;
    placeholders?: Record<string, string | number>;
    skipUntranslated?: boolean;
  }): string {
    const languageCodeToUse = this.translations[languageCode]
      ? languageCode
      : DEFAULT_LANGUAGE_CODE;

    const $ = this.translations[languageCodeToUse];

    if (!$) {
      this.logger.warn(`Translation not found for locale '${languageCode}'`);

      return '';
    }

    const targetSelector = skipUntranslated
      ? 'target:not([state="new"])'
      : 'target';

    let translatedText = $(
      `trans-unit[id="${id}"] > ${
        languageCodeToUse === DEFAULT_LANGUAGE_CODE ? 'source' : targetSelector
      }`
    ).text();

    if (!translatedText && !skipUntranslated) {
      this.logger.warn(
        `Translation not found for id '${id}' in locale '${languageCode}'`
      );
    }

    if (placeholders) {
      for (const [key, value] of Object.entries(placeholders)) {
        translatedText = translatedText.replace(
          new RegExp(`\\$\\{${key}\\}`, 'g'),
          String(value)
        );
      }
    }

    return translatedText.trim();
  }

  private loadFiles() {
    try {
      const files = readdirSync(this.localesPath, 'utf-8');

      for (const file of files) {
        const xmlData = readFileSync(join(this.localesPath, file), 'utf8');
        this.translations[this.parseLanguageCode(file)] =
          this.parseXml(xmlData);
      }
    } catch (error) {
      this.logger.error(error);
    }
  }

  private parseLanguageCode(aFileName: string) {
    const match = /\.([a-zA-Z]+)\.xlf$/.exec(aFileName);

    return match ? match[1] : DEFAULT_LANGUAGE_CODE;
  }

  private parseXml(xmlData: string): cheerio.CheerioAPI {
    return cheerio.load(xmlData, { xmlMode: true });
  }
}
