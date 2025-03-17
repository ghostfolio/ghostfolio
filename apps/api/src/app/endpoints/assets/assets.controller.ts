import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { interpolate } from '@ghostfolio/common/helper';

import {
  Controller,
  Get,
  Param,
  Res,
  Version,
  VERSION_NEUTRAL
} from '@nestjs/common';
import { Response } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';

@Controller('assets')
export class AssetsController {
  private webManifest = '';

  public constructor(
    public readonly configurationService: ConfigurationService
  ) {
    try {
      this.webManifest = readFileSync(
        join(__dirname, 'assets', 'site.webmanifest'),
        'utf8'
      );
    } catch {}
  }

  @Get('/:languageCode/site.webmanifest')
  @Version(VERSION_NEUTRAL)
  public getWebManifest(
    @Param('languageCode') languageCode: string,
    @Res() res: Response
  ): void {
    const rootUrl = this.configurationService.get('ROOT_URL');
    const webManifest = interpolate(this.webManifest, {
      languageCode,
      rootUrl
    });

    res.setHeader('Content-Type', 'application/json');
    res.send(webManifest);
  }
}
