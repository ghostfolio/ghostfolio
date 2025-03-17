import { Controller, Get, Param, Res, Version, VERSION_NEUTRAL } from '@nestjs/common';
import { Response } from 'express';
import { interpolate } from '@ghostfolio/common/helper';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import * as fs from 'fs';
import * as path from 'path';

@Controller('assets')
export class WebManifestController {
  public webManifestTemplate: string;

  public constructor(public readonly configService: ConfigurationService) {
    try {
      this.webManifestTemplate = fs.readFileSync(
        path.resolve(__dirname, '../../assets/site.webmanifest'), 
        'utf8'
      );
    } catch (error) {
      console.error('Error reading site.webmanifest:', error);
      this.webManifestTemplate = ''; 
    }
  }

  @Get('/:languageCode/site.webmanifest')
  @Version(VERSION_NEUTRAL)
  public getWebManifest(@Param('languageCode') languageCode: string, @Res() res: Response): void {
    const rootUrl = this.configService.get('ROOT_URL') || 'https://default.url.com';
    const webManifest = interpolate(this.webManifestTemplate, { languageCode, rootUrl });

    res.setHeader('Content-Type', 'application/json');
    res.send(webManifest);
  }
}
