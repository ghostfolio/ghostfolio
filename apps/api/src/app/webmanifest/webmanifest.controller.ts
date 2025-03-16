import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';

import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';

@Controller('site.webmanifest')
export class WebManifestController {
  constructor(private readonly configService: ConfigurationService) {}

  @Get('/:languageCode')
  getWebManifest(
    @Param('languageCode') languageCode: string,
    @Res() res: Response
  ) {
    const rootUrl = this.configService.get('ROOT_URL');

    const webManifest = {
      background_color: '#FFFFFF',
      categories: ['finance', 'utilities'],
      description: 'Open Source Wealth Management Software',
      display: 'standalone',
      icons: [
        {
          sizes: '192x192',
          src: '/assets/android-chrome-192x192.png',
          type: 'image/png'
        },
        {
          purpose: 'any',
          sizes: '512x512',
          src: '/assets/android-chrome-512x512.png',
          type: 'image/png'
        },
        {
          purpose: 'maskable',
          sizes: '512x512',
          src: '/assets/android-chrome-512x512.png',
          type: 'image/png'
        }
      ],
      name: 'Ghostfolio',
      orientation: 'portrait',
      short_name: 'Ghostfolio',
      start_url: `/${languageCode}/`, // Dynamic Language Support
      theme_color: '#FFFFFF',
      url: rootUrl
    };

    res.setHeader('Content-Type', 'application/json');
    res.send(webManifest);
  }
}
