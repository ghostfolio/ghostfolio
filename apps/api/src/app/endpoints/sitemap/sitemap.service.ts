import { I18nService } from '@ghostfolio/api/services/i18n/i18n.service';
import { SUPPORTED_LANGUAGE_CODES } from '@ghostfolio/common/config';
import { personalFinanceTools } from '@ghostfolio/common/personal-finance-tools';

import { Injectable } from '@nestjs/common';

@Injectable()
export class SitemapService {
  public constructor(private readonly i18nService: I18nService) {}

  public getPersonalFinanceTools({ currentDate }: { currentDate: string }) {
    return personalFinanceTools
      .map(({ alias, key }) => {
        return SUPPORTED_LANGUAGE_CODES.map((languageCode) => {
          const resourcesPath = this.i18nService.getTranslation({
            languageCode,
            id: 'routes.resources'
          });

          const personalFinanceToolsPath = this.i18nService.getTranslation({
            languageCode,
            id: 'routes.resources.personalFinanceTools'
          });

          const openSourceAlternativeToPath = this.i18nService.getTranslation({
            languageCode,
            id: 'routes.resources.personalFinanceTools.openSourceAlternativeTo'
          });

          return [
            '<url>',
            `  <loc>https://ghostfol.io/${languageCode}/${resourcesPath}/${personalFinanceToolsPath}/${openSourceAlternativeToPath}-${alias ?? key}</loc>`,
            `  <lastmod>${currentDate}T00:00:00+00:00</lastmod>`,
            '</url>'
          ].join('\n');
        });
      })
      .join('\n');
  }
}
