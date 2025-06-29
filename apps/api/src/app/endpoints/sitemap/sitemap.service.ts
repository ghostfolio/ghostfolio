import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { I18nService } from '@ghostfolio/api/services/i18n/i18n.service';
import { SUPPORTED_LANGUAGE_CODES } from '@ghostfolio/common/config';
import { personalFinanceTools } from '@ghostfolio/common/personal-finance-tools';
import { PublicRoute } from '@ghostfolio/common/routes/interfaces/public-route.interface';
import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { Injectable } from '@nestjs/common';

@Injectable()
export class SitemapService {
  private static readonly TRANSLATION_TAGGED_MESSAGE_REGEX =
    /:.*@@(?<id>[a-zA-Z0-9.]+):(?<message>.+)/;

  public constructor(
    private readonly configurationService: ConfigurationService,
    private readonly i18nService: I18nService
  ) {}

  public getPersonalFinanceTools({ currentDate }: { currentDate: string }) {
    const rootUrl = this.configurationService.get('ROOT_URL');

    return SUPPORTED_LANGUAGE_CODES.flatMap((languageCode) => {
      return personalFinanceTools.map(({ alias, key }) => {
        const route =
          publicRoutes.resources.subRoutes.personalFinanceTools.subRoutes
            .product;
        const params = {
          currentDate,
          languageCode,
          rootUrl,
          urlPostfix: alias ?? key
        };

        return this.createRouteSitemapUrl({ ...params, route });
      });
    }).join('\n');
  }

  public getPublicRoutes({ currentDate }: { currentDate: string }) {
    const rootUrl = this.configurationService.get('ROOT_URL');

    return SUPPORTED_LANGUAGE_CODES.flatMap((languageCode) => {
      const params = {
        currentDate,
        languageCode,
        rootUrl
      };

      return [
        this.createRouteSitemapUrl(params),
        ...this.createSitemapUrls(params, publicRoutes)
      ];
    }).join('\n');
  }

  private createRouteSitemapUrl({
    currentDate,
    languageCode,
    rootUrl,
    route,
    urlPostfix
  }: {
    currentDate: string;
    languageCode: string;
    rootUrl: string;
    route?: PublicRoute;
    urlPostfix?: string;
  }): string {
    const segments =
      route?.routerLink.map((link) => {
        const match = link.match(
          SitemapService.TRANSLATION_TAGGED_MESSAGE_REGEX
        );

        const segment = match
          ? (this.i18nService.getTranslation({
              languageCode,
              id: match.groups.id
            }) ?? match.groups.message)
          : link;

        return segment.replace(/^\/+|\/+$/, '');
      }) ?? [];

    const location =
      [rootUrl, languageCode, ...segments].join('/') +
      (urlPostfix ? `-${urlPostfix}` : '');

    return [
      '  <url>',
      `    <loc>${location}</loc>`,
      `    <lastmod>${currentDate}T00:00:00+00:00</lastmod>`,
      '  </url>'
    ].join('\n');
  }

  private createSitemapUrls(
    params: { currentDate: string; languageCode: string; rootUrl: string },
    routes: Record<string, PublicRoute>
  ): string[] {
    return Object.values(routes).flatMap((route) => {
      if (route.excludeFromSitemap) {
        return [];
      }

      const urls = [this.createRouteSitemapUrl({ ...params, route })];

      if (route.subRoutes) {
        urls.push(...this.createSitemapUrls(params, route.subRoutes));
      }

      return urls;
    });
  }
}
