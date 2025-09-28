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

  public getBlogPosts({ currentDate }: { currentDate: string }) {
    const rootUrl = this.configurationService.get('ROOT_URL');

    return [
      {
        languageCode: 'de',
        routerLink: ['2021', '07', 'hallo-ghostfolio']
      },
      {
        languageCode: 'en',
        routerLink: ['2021', '07', 'hello-ghostfolio']
      },
      {
        languageCode: 'en',
        routerLink: ['2022', '01', 'ghostfolio-first-months-in-open-source']
      },
      {
        languageCode: 'en',
        routerLink: ['2022', '07', 'ghostfolio-meets-internet-identity']
      },
      {
        languageCode: 'en',
        routerLink: ['2022', '07', 'how-do-i-get-my-finances-in-order']
      },
      {
        languageCode: 'en',
        routerLink: ['2022', '08', '500-stars-on-github']
      },
      {
        languageCode: 'en',
        routerLink: ['2022', '10', 'hacktoberfest-2022']
      },
      {
        languageCode: 'en',
        routerLink: ['2022', '11', 'black-friday-2022']
      },
      {
        languageCode: 'en',
        routerLink: [
          '2022',
          '12',
          'the-importance-of-tracking-your-personal-finances'
        ]
      },
      {
        languageCode: 'de',
        routerLink: ['2023', '01', 'ghostfolio-auf-sackgeld-vorgestellt']
      },
      {
        languageCode: 'en',
        routerLink: ['2023', '02', 'ghostfolio-meets-umbrel']
      },
      {
        languageCode: 'en',
        routerLink: ['2023', '03', 'ghostfolio-reaches-1000-stars-on-github']
      },
      {
        languageCode: 'en',
        routerLink: [
          '2023',
          '05',
          'unlock-your-financial-potential-with-ghostfolio'
        ]
      },
      {
        languageCode: 'en',
        routerLink: ['2023', '07', 'exploring-the-path-to-fire']
      },
      {
        languageCode: 'en',
        routerLink: ['2023', '08', 'ghostfolio-joins-oss-friends']
      },
      {
        languageCode: 'en',
        routerLink: ['2023', '09', 'ghostfolio-2']
      },
      {
        languageCode: 'en',
        routerLink: ['2023', '09', 'hacktoberfest-2023']
      },
      {
        languageCode: 'en',
        routerLink: ['2023', '11', 'black-week-2023']
      },
      {
        languageCode: 'en',
        routerLink: ['2023', '11', 'hacktoberfest-2023-debriefing']
      },
      {
        languageCode: 'en',
        routerLink: ['2024', '09', 'hacktoberfest-2024']
      },
      {
        languageCode: 'en',
        routerLink: ['2024', '11', 'black-weeks-2024']
      },
      {
        languageCode: 'en',
        routerLink: ['2025', '09', 'hacktoberfest-2025']
      }
    ]
      .map(({ languageCode, routerLink }) => {
        return this.createRouteSitemapUrl({
          currentDate,
          languageCode,
          rootUrl,
          route: {
            routerLink: [publicRoutes.blog.path, ...routerLink],
            path: undefined
          }
        });
      })
      .join('\n');
  }

  public getPersonalFinanceTools({ currentDate }: { currentDate: string }) {
    const rootUrl = this.configurationService.get('ROOT_URL');

    return SUPPORTED_LANGUAGE_CODES.flatMap((languageCode) => {
      const resourcesPath = this.i18nService.getTranslation({
        languageCode,
        id: publicRoutes.resources.path.match(
          SitemapService.TRANSLATION_TAGGED_MESSAGE_REGEX
        ).groups.id
      });

      const personalFinanceToolsPath = this.i18nService.getTranslation({
        languageCode,
        id: publicRoutes.resources.subRoutes.personalFinanceTools.path.match(
          SitemapService.TRANSLATION_TAGGED_MESSAGE_REGEX
        ).groups.id
      });

      const productPath = this.i18nService.getTranslation({
        languageCode,
        id: publicRoutes.resources.subRoutes.personalFinanceTools.subRoutes.product.path.match(
          SitemapService.TRANSLATION_TAGGED_MESSAGE_REGEX
        ).groups.id
      });

      return personalFinanceTools.map(({ alias, key }) => {
        const routerLink = [
          resourcesPath,
          personalFinanceToolsPath,
          `${productPath}-${alias ?? key}`
        ];

        return this.createRouteSitemapUrl({
          currentDate,
          languageCode,
          rootUrl,
          route: {
            routerLink,
            path: undefined
          }
        });
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
    route
  }: {
    currentDate: string;
    languageCode: string;
    rootUrl: string;
    route?: PublicRoute;
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

    const location = [rootUrl, languageCode, ...segments].join('/');

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
