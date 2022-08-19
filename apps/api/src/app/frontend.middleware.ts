import * as fs from 'fs';
import * as path from 'path';

import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { DEFAULT_LANGUAGE_CODE } from '@ghostfolio/common/config';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class FrontendMiddleware implements NestMiddleware {
  public indexHtmlDe = fs.readFileSync(
    this.getPathOfIndexHtmlFile('de'),
    'utf8'
  );
  public indexHtmlEn = fs.readFileSync(
    this.getPathOfIndexHtmlFile(DEFAULT_LANGUAGE_CODE),
    'utf8'
  );

  public constructor(
    private readonly configurationService: ConfigurationService
  ) {}

  public use(req: Request, res: Response, next: NextFunction) {
    let featureGraphicPath = 'assets/cover.png';

    if (
      req.path === '/en/blog/2022/08/500-stars-on-github' ||
      req.path === '/en/blog/2022/08/500-stars-on-github/'
    ) {
      featureGraphicPath = 'assets/images/blog/500-stars-on-github.jpg';
    }

    if (req.path.startsWith('/api/') || this.isFileRequest(req.url)) {
      // Skip
      next();
    } else if (req.path === '/de' || req.path.startsWith('/de/')) {
      res.send(
        this.interpolate(this.indexHtmlDe, {
          featureGraphicPath,
          languageCode: 'de',
          path: req.path,
          rootUrl: this.configurationService.get('ROOT_URL')
        })
      );
    } else {
      res.send(
        this.interpolate(this.indexHtmlEn, {
          featureGraphicPath,
          languageCode: DEFAULT_LANGUAGE_CODE,
          path: req.path,
          rootUrl: this.configurationService.get('ROOT_URL')
        })
      );
    }
  }

  private getPathOfIndexHtmlFile(aLocale: string) {
    return path.join(__dirname, '..', 'client', aLocale, 'index.html');
  }

  private interpolate(template: string, context: any) {
    return template.replace(/[$]{([^}]+)}/g, (_, objectPath) => {
      const properties = objectPath.split('.');
      return properties.reduce(
        (previous, current) => previous?.[current],
        context
      );
    });
  }

  private isFileRequest(filename: string) {
    if (filename === '/assets/LICENSE') {
      return true;
    } else if (filename.includes('auth/ey')) {
      return false;
    }

    return filename.split('.').pop() !== filename;
  }
}
