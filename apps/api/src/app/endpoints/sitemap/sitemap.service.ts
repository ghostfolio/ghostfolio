import { personalFinanceTools } from '@ghostfolio/common/personal-finance-tools';

import { Injectable } from '@nestjs/common';

@Injectable()
export class SitemapService {
  public getPersonalFinanceTools({ currentDate }: { currentDate: string }) {
    return personalFinanceTools
      .map(({ alias, key }) => {
        return [
          '<url>',
          `  <loc>https://ghostfol.io/de/ressourcen/personal-finance-tools/open-source-alternative-zu-${alias ?? key}</loc>`,
          `  <lastmod>${currentDate}T00:00:00+00:00</lastmod>`,
          '</url>',
          '<url>',
          `  <loc>https://ghostfol.io/en/resources/personal-finance-tools/open-source-alternative-to-${alias ?? key}</loc>`,
          `  <lastmod>${currentDate}T00:00:00+00:00</lastmod>`,
          '</url>',
          '<url>',
          `  <loc>https://ghostfol.io/es/recursos/personal-finance-tools/alternativa-de-software-libre-a-${alias ?? key}</loc>`,
          `  <lastmod>${currentDate}T00:00:00+00:00</lastmod>`,
          '</url>',
          '<url>',
          `  <loc>https://ghostfol.io/fr/ressources/personal-finance-tools/alternative-open-source-a-${alias ?? key}</loc>`,
          `  <lastmod>${currentDate}T00:00:00+00:00</lastmod>`,
          '</url>',
          '<url>',
          `  <loc>https://ghostfol.io/it/risorse/personal-finance-tools/alternativa-open-source-a-${alias ?? key}</loc>`,
          `  <lastmod>${currentDate}T00:00:00+00:00</lastmod>`,
          '</url>',
          '<url>',
          `  <loc>https://ghostfol.io/nl/bronnen/personal-finance-tools/open-source-alternatief-voor-${alias ?? key}</loc>`,
          `  <lastmod>${currentDate}T00:00:00+00:00</lastmod>`,
          '</url>',
          '<url>',
          `  <loc>https://ghostfol.io/pt/recursos/personal-finance-tools/alternativa-de-software-livre-ao-${alias ?? key}</loc>`,
          `  <lastmod>${currentDate}T00:00:00+00:00</lastmod>`,
          '</url>'
        ].join('\n');
      })
      .join('\n');
  }
}
