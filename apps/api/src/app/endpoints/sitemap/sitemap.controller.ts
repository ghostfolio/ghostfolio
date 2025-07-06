import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import {
  DATE_FORMAT,
  getYesterday,
  interpolate
} from '@ghostfolio/common/helper';

import { Controller, Get, Res, VERSION_NEUTRAL, Version } from '@nestjs/common';
import { format } from 'date-fns';
import { Response } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';

import { SitemapService } from './sitemap.service';

@Controller('sitemap.xml')
export class SitemapController {
  public sitemapXml = '';

  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly sitemapService: SitemapService
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
  public getSitemapXml(@Res() response: Response) {
    const currentDate = format(getYesterday(), DATE_FORMAT);

    response.setHeader('content-type', 'application/xml');
    response.send(
      interpolate(this.sitemapXml, {
        personalFinanceTools: this.configurationService.get(
          'ENABLE_FEATURE_SUBSCRIPTION'
        )
          ? this.sitemapService.getPersonalFinanceTools({ currentDate })
          : '',
        publicRoutes: this.sitemapService.getPublicRoutes({
          currentDate
        })
      })
    );
  }
}
