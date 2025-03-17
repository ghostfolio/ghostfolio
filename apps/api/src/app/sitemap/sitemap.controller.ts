import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import {
  DATE_FORMAT,
  getYesterday,
  interpolate
} from '@ghostfolio/common/helper';
import { personalFinanceTools } from '@ghostfolio/common/personal-finance-tools';

import { Controller, Get, Res, VERSION_NEUTRAL, Version } from '@nestjs/common';
import { format } from 'date-fns';
import { Response } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';

@Controller('sitemap.xml')
export class SitemapController {
  public sitemapXml = '';

  public constructor(
    private readonly configurationService: ConfigurationService
  ) {
    try {
      this.sitemapXml = readFileSync(
        join(__dirname, 'assets', 'sitemap.xml'),
        'utf8'
      );
    } catch {}
  }

  @Get()
  @Version(VERSION_NEUTRAL)
  public async getSitemapXml(@Res() response: Response): Promise<void> {
    const currentDate = format(getYesterday(), DATE_FORMAT);

    response.setHeader('content-type', 'application/xml');
    response.send(
      interpolate(this.sitemapXml, {
        currentDate,
        personalFinanceTools: this.configurationService.get(
          'ENABLE_FEATURE_SUBSCRIPTION'
        )
          ? personalFinanceTools
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
              .join('\n')
          : ''
      })
    );
  }
}
