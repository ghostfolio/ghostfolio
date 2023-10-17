import * as fs from 'fs';
import { join } from 'path';
import { Injectable } from '@nestjs/common';
import * as cheerio from 'cheerio';

@Injectable()
export class I18nService {
  private localesPath = join(__dirname, 'assets/locales/');
  private localeRegex = /^messages\.[a-z]{2}\.xlf$/;
  private translations: { [locale: string]: cheerio.CheerioAPI } = {};

  constructor() {
    this.loadFiles();
  }

  public getTranslation({
    id,
    locale
  }: {
    id: string;
    locale: string;
  }): string {
    const $ = this.translations[locale];
    if (!$) {
      throw new Error(`Translation not found for locale '${locale}'`);
    }

    const translatedText = $(`trans-unit[id="${id}"] > target`).text();
    if (!translatedText) {
      throw new Error(
        `Translation not found for id '${id}' in locale '${locale}'`
      );
    }

    return translatedText;
  }

  private loadFiles() {
    try {
      const files = fs.readdirSync(this.localesPath, 'utf-8');
      for (const file of files) {
        if (!this.localeRegex.test(file)) continue;
        if (!fs.existsSync(`${this.localesPath}${file}`)) {
          throw new Error(`File: ${file} not found`);
        } else {
          const xmlData = fs.readFileSync(`${this.localesPath}${file}`, 'utf8');
          this.translations[file.split('.')[1]] = this.parseXml(xmlData);
        }
      }
    } catch (error) {
      console.log(error);
    }
  }

  private parseXml(xmlData: string): cheerio.CheerioAPI {
    const selectorFn = cheerio.load(xmlData, { xmlMode: true });
    return selectorFn;
  }
}
