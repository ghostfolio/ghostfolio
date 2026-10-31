import { environment } from '@ghostfolio/api/environments/environment';
import { I18nService } from '@ghostfolio/api/services/i18n/i18n.service';
import {
  DEFAULT_LANGUAGE_CODE,
  STORYBOOK_PATH,
  SUPPORTED_LANGUAGE_CODES
} from '@ghostfolio/common/config';
import { DATE_FORMAT, interpolate } from '@ghostfolio/common/helper';
import { personalFinanceTools } from '@ghostfolio/common/personal-finance-tools';
import { PublicRoute } from '@ghostfolio/common/routes/interfaces/public-route.interface';
import { publicRoutes } from '@ghostfolio/common/routes/routes';

import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { format } from 'date-fns';
import { NextFunction, Request, Response } from 'express';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const title = 'Ghostfolio';

const locales = {
  '/de/blog/2021/07/hallo-ghostfolio': {
    description:
      'Hallo Ghostfolio: Die Vorstellung des Open Source Projekts für die persönlichen Finanzen. Welches Problem es löst und welche Vision dahinter steht.'
  },
  '/de/blog/2023/01/ghostfolio-auf-sackgeld-vorgestellt': {
    description:
      'Ghostfolio auf Sackgeld.com: Der Bericht erläutert die Funktionsweise, die unterstützten Assets und die Preisstruktur der Open Source Software.',
    featureGraphicPath: 'assets/images/blog/ghostfolio-x-sackgeld.png',
    title: `Ghostfolio auf Sackgeld.com vorgestellt - ${title}`
  },
  '/en/blog/2021/07/hello-ghostfolio': {
    description:
      'Meet Ghostfolio, an open source personal finance software. Learn which problem it solves and the vision of an overview of all your assets in real time.'
  },
  '/en/blog/2022/01/ghostfolio-first-months-in-open-source': {
    description:
      'A look back at the first months of Ghostfolio in open source: the road to 100 stars on GitHub and why the benefits of public development outweigh the drawbacks.'
  },
  '/en/blog/2022/07/ghostfolio-meets-internet-identity': {
    description:
      'Ghostfolio now supports passwordless sign-in with Internet Identity, a blockchain authentication system. Track your portfolio without being tracked.'
  },
  '/en/blog/2022/07/how-do-i-get-my-finances-in-order': {
    description:
      'Before you start long-term investing, get your finances in order. Follow Peter as he plans his monthly budget, saves money and sets financial goals.'
  },
  '/en/blog/2022/08/500-stars-on-github': {
    description:
      'Ghostfolio celebrates 500 stars on GitHub. A recap of the growing community, the new message queue and the Internet Identity integration for Web3.',
    featureGraphicPath: 'assets/images/blog/500-stars-on-github.jpg',
    title: `500 Stars - ${title}`
  },
  '/en/blog/2022/10/hacktoberfest-2022': {
    description:
      'Ghostfolio joins Hacktoberfest for the first time. Make your first pull request on GitHub and contribute to the open source personal finance software.',
    featureGraphicPath: 'assets/images/blog/hacktoberfest-2022.png',
    title: `Hacktoberfest 2022 - ${title}`
  },
  '/en/blog/2022/11/black-friday-2022': {
    description:
      'Black Friday 2022 offer: 75% off the annual plan of Ghostfolio Premium. This offer has ended. See the pricing page for the current plans.'
  },
  '/en/blog/2022/12/the-importance-of-tracking-your-personal-finances': {
    description:
      'Tracking your assets helps you reach your financial goals. Learn why to monitor your personal finances, understand your net worth and act when required.',
    featureGraphicPath: 'assets/images/blog/20221226.jpg',
    title: `The importance of tracking your personal finances - ${title}`
  },
  '/en/blog/2023/02/ghostfolio-meets-umbrel': {
    description:
      'Ghostfolio is now available in the Umbrel App Store. Self-host the open source personal finance software on a home server and stay in control of your data.',
    featureGraphicPath: 'assets/images/blog/ghostfolio-x-umbrel.png',
    title: `Ghostfolio meets Umbrel - ${title}`
  },
  '/en/blog/2023/03/ghostfolio-reaches-1000-stars-on-github': {
    description:
      'Ghostfolio reaches 1’000 stars on GitHub. A look at the achievements of the open source personal finance software, its community and future developments.',
    featureGraphicPath: 'assets/images/blog/1000-stars-on-github.jpg',
    title: `Ghostfolio reaches 1’000 Stars on GitHub - ${title}`
  },
  '/en/blog/2023/05/unlock-your-financial-potential-with-ghostfolio': {
    description:
      'Discover why Ghostfolio is the ideal open source tool to manage stocks, ETFs and cryptocurrencies across multiple platforms, with insights and privacy.',
    featureGraphicPath: 'assets/images/blog/20230520.jpg',
    title: `Unlock your Financial Potential with Ghostfolio - ${title}`
  },
  '/en/blog/2023/07/exploring-the-path-to-fire': {
    description:
      'What is FIRE? Explore the concept of Financial Independence and Retiring Early, the famous 4% rule, and the pros and cons of this popular movement.',
    featureGraphicPath: 'assets/images/blog/20230701.jpg',
    title: `Exploring the Path to FIRE - ${title}`
  },
  '/en/blog/2023/08/ghostfolio-joins-oss-friends': {
    description:
      'Ghostfolio is now part of OSS Friends, a new initiative that helps open source projects grow. Read the story behind the movement and how to join it.',
    featureGraphicPath: 'assets/images/blog/ghostfolio-joins-oss-friends.png',
    title: `Ghostfolio joins OSS Friends - ${title}`
  },
  '/en/blog/2023/09/ghostfolio-2': {
    description:
      'Ghostfolio 2.0 is here: extended data import, comprehensive analytics, increased stability and the latest technology in open source wealth management.',
    featureGraphicPath: 'assets/images/blog/ghostfolio-2.jpg',
    title: `Announcing Ghostfolio 2.0 - ${title}`
  },
  '/en/blog/2023/09/hacktoberfest-2023': {
    description:
      'Ghostfolio joins Hacktoberfest for the second time. Make your first pull request on GitHub and contribute to the open source personal finance software.',
    featureGraphicPath: 'assets/images/blog/hacktoberfest-2023.png',
    title: `Hacktoberfest 2023 - ${title}`
  },
  '/en/blog/2023/11/black-week-2023': {
    description:
      'Black Week 2023 offer: 33% off the annual plan of Ghostfolio Premium. This offer has ended. See the pricing page for the current plans.',
    featureGraphicPath: 'assets/images/blog/black-week-2023.jpg',
    title: `Black Week 2023 - ${title}`
  },
  '/en/blog/2023/11/hacktoberfest-2023-debriefing': {
    description:
      'Looking back at Hacktoberfest 2023 at Ghostfolio: 20 developers from around the world and as many as 100 new features and improvements in the project.',
    featureGraphicPath: 'assets/images/blog/hacktoberfest-2023.png',
    title: `Hacktoberfest 2023 Debriefing - ${title}`
  },
  '/en/blog/2024/09/hacktoberfest-2024': {
    description:
      'Ghostfolio joins Hacktoberfest for the third time. Make your first pull request on GitHub and contribute to the open source personal finance dashboard.',
    featureGraphicPath: 'assets/images/blog/hacktoberfest-2024.png',
    title: `Hacktoberfest 2024 - ${title}`
  },
  '/en/blog/2024/11/black-weeks-2024': {
    description:
      'Black Weeks 2024 offer: 25% off the annual plan of Ghostfolio Premium plus 3 extra months. This offer has ended. See the pricing page for the current plans.',
    featureGraphicPath: 'assets/images/blog/black-weeks-2024.jpg',
    title: `Black Weeks 2024 - ${title}`
  },
  '/en/blog/2025/09/hacktoberfest-2025': {
    description:
      'Ghostfolio joins Hacktoberfest for the fourth time. Make your first pull request on GitHub and contribute to the modern personal finance dashboard.',
    featureGraphicPath: 'assets/images/blog/hacktoberfest-2025.png',
    title: `Hacktoberfest 2025 - ${title}`
  },
  '/en/blog/2025/11/black-weeks-2025': {
    description:
      'Black Weeks 2025 offer: 25% off the annual plan of Ghostfolio Premium plus 3 extra months. This offer has ended. See the pricing page for the current plans.',
    featureGraphicPath: 'assets/images/blog/black-weeks-2025.jpg',
    title: `Black Weeks 2025 - ${title}`
  },
  '/en/blog/2026/04/ghostfolio-3': {
    description:
      'Ghostfolio 3.0 is here: a refreshed user interface, expanded analytics, improved stability, more languages and an updated technology stack.',
    featureGraphicPath: 'assets/images/blog/ghostfolio-3.jpg',
    title: `Announcing Ghostfolio 3.0 - ${title}`
  },
  '/en/blog/2026/11/black-weeks-2026': {
    description:
      'Get 15 months of Ghostfolio Premium for the price of 12. Track stocks, ETFs and crypto with the open source portfolio tracker. Offer valid until the end of November.',
    featureGraphicPath: 'assets/images/blog/black-weeks-2026.jpg',
    title: `Black Weeks 2026: 15 Months of Premium - ${title}`
  }
};

@Injectable()
export class HtmlTemplateMiddleware implements NestMiddleware {
  private readonly logger = new Logger(HtmlTemplateMiddleware.name);

  private indexHtmlMap: { [languageCode: string]: string } = {};
  private routeDescriptionsMap: {
    [languageCode: string]: { [path: string]: string };
  } = {};

  public constructor(private readonly i18nService: I18nService) {
    if (!environment.production) {
      return;
    }

    this.indexHtmlMap = SUPPORTED_LANGUAGE_CODES.reduce((map, languageCode) => {
      const indexHtmlPath = join(
        __dirname,
        '..',
        'client',
        languageCode,
        'index.html'
      );

      try {
        // Restore the interpolation token which the template replaces with a
        // static fallback title to avoid showing an unresolved template
        // literal when served without interpolation (e.g. by the service worker)
        map[languageCode] = readFileSync(indexHtmlPath, 'utf8').replace(
          /<title>.*?<\/title>/,
          '<title>${title}</title>'
        );
      } catch {
        this.logger.warn(
          `Skipping language '${languageCode}': ${indexHtmlPath} not found`
        );
      }

      return map;
    }, {});
  }

  public use(request: Request, response: Response, next: NextFunction) {
    const path = request.originalUrl.replace(/\/$/, '');
    let languageCode = path.substr(1, 2);

    if (
      !(SUPPORTED_LANGUAGE_CODES as readonly string[]).includes(languageCode) ||
      !this.indexHtmlMap[languageCode]
    ) {
      languageCode = DEFAULT_LANGUAGE_CODE;
    }

    const currentDate = format(new Date(), DATE_FORMAT);
    const rootUrl = process.env.ROOT_URL || environment.rootUrl;

    if (
      path.startsWith('/api/') ||
      path.startsWith(STORYBOOK_PATH) ||
      this.isFileRequest(path) ||
      !environment.production
    ) {
      // Skip
      next();
    } else {
      const indexHtml = interpolate(this.indexHtmlMap[languageCode], {
        currentDate,
        languageCode,
        path,
        rootUrl,
        description:
          locales[path]?.description ??
          this.getRouteDescription({ languageCode, path }) ??
          this.i18nService.getTranslation({
            languageCode,
            id: 'metaDescription'
          }),
        featureGraphicPath:
          locales[path]?.featureGraphicPath ?? 'assets/cover.png',
        keywords: this.i18nService.getTranslation({
          languageCode,
          id: 'metaKeywords'
        }),
        title:
          locales[path]?.title ??
          `${title} – ${this.i18nService.getTranslation({
            languageCode,
            id: 'slogan'
          })}`
      });

      return response.send(indexHtml);
    }
  }

  private getPersonalFinanceToolDescriptions(
    languageCode: string
  ): [string, string][] {
    const description = this.i18nService.getTranslation({
      languageCode,
      id: 'metaDescription.resources.personalFinanceTools.product',
      skipUntranslated: true
    });

    const path = [
      '',
      languageCode,
      ...this.i18nService.getLocalizedRouterLink({
        languageCode,
        routerLink:
          publicRoutes.resources.subRoutes.personalFinanceTools.subRoutes
            .product.routerLink
      })
    ].join('/');

    return personalFinanceTools.map(({ alias, key, name }) => {
      return [`${path}-${alias ?? key}`, interpolate(description, { name })];
    });
  }

  private getPublicRouteDescriptions({
    id,
    languageCode,
    routes
  }: {
    id: string;
    languageCode: string;
    routes: Record<string, PublicRoute>;
  }): [string, string][] {
    return Object.entries(routes).flatMap(([key, route]) => {
      if (route.excludeFromSitemap) {
        return [];
      }

      const routeId = `${id}.${key}`;

      const path = [
        '',
        languageCode,
        ...this.i18nService.getLocalizedRouterLink({
          languageCode,
          routerLink: route.routerLink
        })
      ].join('/');

      const description = this.i18nService.getTranslation({
        languageCode,
        id: routeId,
        skipUntranslated: true
      });

      return [
        [path, description] as [string, string],
        ...this.getPublicRouteDescriptions({
          languageCode,
          id: routeId,
          routes: route.subRoutes ?? {}
        })
      ];
    });
  }

  private getRouteDescription({
    languageCode,
    path
  }: {
    languageCode: string;
    path: string;
  }): string | undefined {
    // Build once per language since the translation lookups are expensive
    this.routeDescriptionsMap[languageCode] ??= Object.fromEntries(
      [
        ...this.getPersonalFinanceToolDescriptions(languageCode),
        ...this.getPublicRouteDescriptions({
          languageCode,
          id: 'metaDescription',
          routes: publicRoutes
        })
      ].filter(([, description]) => {
        return description;
      })
    );

    return this.routeDescriptionsMap[languageCode][path];
  }

  private isFileRequest(filename: string) {
    if (filename === '/assets/LICENSE') {
      return true;
    } else if (
      filename.endsWith('-de.fi') ||
      filename.endsWith('-markets.sh') ||
      filename.includes('auth/ey')
    ) {
      return false;
    }

    return filename.split('.').pop() !== filename;
  }
}
