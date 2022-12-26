import * as fs from 'fs';
import * as path from 'path';

import { ConfigurationService } from '@ghostfolio/api/services/configuration.service';
import { DEFAULT_LANGUAGE_CODE } from '@ghostfolio/common/config';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class FrontendMiddleware implements NestMiddleware {
  public indexHtmlDe = '';
  public indexHtmlEn = '';
  public indexHtmlEs = '';
  public indexHtmlIt = '';
  public indexHtmlNl = '';
  public isProduction: boolean;

  public constructor(
    private readonly configService: ConfigService,
    private readonly configurationService: ConfigurationService
  ) {
    const NODE_ENV =
      this.configService.get<'development' | 'production'>('NODE_ENV') ??
      'development';

    this.isProduction = NODE_ENV === 'production';

    try {
      this.indexHtmlDe = fs.readFileSync(
        this.getPathOfIndexHtmlFile('de'),
        'utf8'
      );
      this.indexHtmlEn = fs.readFileSync(
        this.getPathOfIndexHtmlFile(DEFAULT_LANGUAGE_CODE),
        'utf8'
      );
      this.indexHtmlEs = fs.readFileSync(
        this.getPathOfIndexHtmlFile('es'),
        'utf8'
      );
      this.indexHtmlIt = fs.readFileSync(
        this.getPathOfIndexHtmlFile('it'),
        'utf8'
      );
      this.indexHtmlNl = fs.readFileSync(
        this.getPathOfIndexHtmlFile('nl'),
        'utf8'
      );
    } catch {}
  }

  public use(request: Request, response: Response, next: NextFunction) {
    let featureGraphicPath = 'assets/cover.png';

    if (request.path.startsWith('/en/blog/2022/08/500-stars-on-github')) {
      featureGraphicPath = 'assets/images/blog/500-stars-on-github.jpg';
    } else if (request.path.startsWith('/en/blog/2022/10/hacktoberfest-2022')) {
      featureGraphicPath = 'assets/images/blog/hacktoberfest-2022.png';
    } else if (request.path.startsWith('/en/blog/2022/11/black-friday-2022')) {
      featureGraphicPath = 'assets/images/blog/black-friday-2022.jpg';
    } else if (
      request.path.startsWith(
        '/en/blog/2022/12/the-importance-of-tracking-your-personal-finances'
      )
    ) {
      featureGraphicPath = 'assets/images/blog/20221226.jpg';
    }

    if (
      request.path.startsWith('/api/') ||
      this.isFileRequest(request.url) ||
      !this.isProduction
    ) {
      // Skip
      next();
    } else if (request.path === '/de' || request.path.startsWith('/de/')) {
      response.send(
        this.interpolate(this.indexHtmlDe, {
          featureGraphicPath,
          languageCode: 'de',
          path: request.path,
          rootUrl: this.configurationService.get('ROOT_URL')
        })
      );
    } else if (request.path === '/es' || request.path.startsWith('/es/')) {
      response.send(
        this.interpolate(this.indexHtmlEs, {
          featureGraphicPath,
          languageCode: 'es',
          path: request.path,
          rootUrl: this.configurationService.get('ROOT_URL')
        })
      );
    } else if (request.path === '/it' || request.path.startsWith('/it/')) {
      response.send(
        this.interpolate(this.indexHtmlIt, {
          featureGraphicPath,
          languageCode: 'it',
          path: request.path,
          rootUrl: this.configurationService.get('ROOT_URL')
        })
      );
    } else if (request.path === '/nl' || request.path.startsWith('/nl/')) {
      response.send(
        this.interpolate(this.indexHtmlNl, {
          featureGraphicPath,
          languageCode: 'nl',
          path: request.path,
          rootUrl: this.configurationService.get('ROOT_URL')
        })
      );
    } else {
      response.send(
        this.interpolate(this.indexHtmlEn, {
          featureGraphicPath,
          languageCode: DEFAULT_LANGUAGE_CODE,
          path: request.path,
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
