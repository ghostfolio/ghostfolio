import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { I18nService } from '@ghostfolio/api/services/i18n/i18n.service';
import { SUPPORTED_LANGUAGE_CODES } from '@ghostfolio/common/config';
import { personalFinanceTools } from '@ghostfolio/common/personal-finance-tools';
import { PublicRoute } from '@ghostfolio/common/routes/interfaces/public-route.interface';
import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { Injectable } from '@nestjs/common';

@Injectable()
export class SitemapService {
  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly i18nService: I18nService
  ) {}

  public getPersonalFinanceTools({ currentDate }: { currentDate: string }) {
    const rootUrl = this.configurationService.get('ROOT_URL');

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
            '  <url>',
            `    <loc>${rootUrl}/${languageCode}/${resourcesPath}/${personalFinanceToolsPath}/${openSourceAlternativeToPath}-${alias ?? key}</loc>`,
            `    <lastmod>${currentDate}T00:00:00+00:00</lastmod>`,
            '  </url>'
          ].join('\n');
        });
      })
      .flat()
      .join('\n');
  }

  public getPublicRoutes({ currentDate }: { currentDate: string }) {
    const rootUrl = this.configurationService.get('ROOT_URL');

    return SUPPORTED_LANGUAGE_CODES.flatMap((languageCode) => {
      const pathSegments = [];
      const params = {
        rootUrl,
        languageCode,
        currentDate
      };

      // add language specific root URL
      const urls = [this.createRouteSitemapUrl(pathSegments, params)];

      urls.push(...this.createSitemapUrls(publicRoutes, pathSegments, params));

      return urls;
    }).join('\n');
  }

  private createSitemapUrls(
    routes: Record<string, PublicRoute>,
    pathSegments: string[],
    params: { rootUrl: string; languageCode: string; currentDate: string }
  ): string[] {
    return Object.values(routes).flatMap((route) => {
      if (route.excludeFromSitemap) return [];

      const currentPathSegments = [
        ...pathSegments,
        this.kebabToCamel(route.path)
      ];

      const urls = [this.createRouteSitemapUrl(currentPathSegments, params)];

      if (route.subRoutes) {
        urls.push(
          ...this.createSitemapUrls(
            route.subRoutes,
            currentPathSegments,
            params
          )
        );
      }

      return urls;
    });
  }

  private createRouteSitemapUrl(
    pathSegments: string[],
    {
      rootUrl,
      languageCode,
      currentDate
    }: { rootUrl: string; languageCode: string; currentDate: string }
  ): string {
    const segments = pathSegments.map((_, index, segments) => {
      const translationId = ['routes', ...segments.slice(0, index + 1)].join(
        '.'
      );

      return this.i18nService.getTranslation({
        languageCode,
        id: translationId
      });
    });
    const location = [rootUrl, languageCode, ...segments].join('/');

    return [
      '  <url>',
      `    <loc>${location}</loc>`,
      `    <lastmod>${currentDate}T00:00:00+00:00</lastmod>`,
      '  </url>'
    ].join('\n');
  }

  private kebabToCamel(str: string): string {
    return str.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
  }
}
