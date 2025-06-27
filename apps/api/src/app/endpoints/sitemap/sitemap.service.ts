import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { I18nService } from '@ghostfolio/api/services/i18n/i18n.service';
import { SUPPORTED_LANGUAGE_CODES } from '@ghostfolio/common/config';
import { personalFinanceTools } from '@ghostfolio/common/personal-finance-tools';
import { PublicRoute } from '@ghostfolio/common/routes/interfaces/public-route.interface';
import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { Injectable } from '@nestjs/common';

const translationTaggedMessageRegex =
  /:.*@@(?<id>[a-zA-Z0-9.]+):(?<message>.+)/;

@Injectable()
export class SitemapService {
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
          rootUrl,
          languageCode,
          currentDate,
          urlPostfix: alias ?? key
        };

        return this.createRouteSitemapUrl({ route, ...params });
      });
    }).join('\n');
  }

  public getPublicRoutes({ currentDate }: { currentDate: string }) {
    const rootUrl = this.configurationService.get('ROOT_URL');

    return SUPPORTED_LANGUAGE_CODES.flatMap((languageCode) => {
      const params = {
        rootUrl,
        languageCode,
        currentDate
      };

      // add language specific root URL
      const urls = [this.createRouteSitemapUrl(params)];

      urls.push(...this.createSitemapUrls(publicRoutes, params));

      return urls;
    }).join('\n');
  }

  private createSitemapUrls(
    routes: Record<string, PublicRoute>,
    params: { rootUrl: string; languageCode: string; currentDate: string }
  ): string[] {
    return Object.values(routes).flatMap((route) => {
      if (route.excludeFromSitemap) return [];

      const urls = [this.createRouteSitemapUrl({ route, ...params })];

      if (route.subRoutes) {
        urls.push(...this.createSitemapUrls(route.subRoutes, params));
      }

      return urls;
    });
  }

  private createRouteSitemapUrl({
    route,
    rootUrl,
    languageCode,
    currentDate,
    urlPostfix
  }: {
    route?: PublicRoute;
    rootUrl: string;
    languageCode: string;
    currentDate: string;
    urlPostfix?: string;
  }): string {
    const segments =
      route?.routerLink.map((link) => {
        const match = link.match(translationTaggedMessageRegex);
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
}
