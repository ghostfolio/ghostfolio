import {
  DATE_FORMAT,
  getYesterday,
  interpolate
} from '@ghostfolio/common/helper';

import { Controller, Get, Res, VERSION_NEUTRAL, Version } from '@nestjs/common';
import { format } from 'date-fns';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@Controller('sitemap.xml')
export class SitemapController {
  public sitemapXml = '';

  public constructor() {
    try {
      this.sitemapXml = fs.readFileSync(
        path.join(__dirname, 'assets', 'sitemap.xml'),
        'utf8'
      );
    } catch {}
  }

  @Get()
  @Version(VERSION_NEUTRAL)
  public async flushCache(@Res() response: Response): Promise<void> {
    response.setHeader('content-type', 'application/xml');
    response.send(
      interpolate(this.sitemapXml, {
        currentDate: format(getYesterday(), DATE_FORMAT)
      })
    );
  }
}
