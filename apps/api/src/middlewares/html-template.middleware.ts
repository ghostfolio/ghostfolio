import { environment } from '@ghostfolio/api/environments/environment';
import { I18nService } from '@ghostfolio/api/services/i18n/i18n.service';
import {
  DEFAULT_LANGUAGE_CODE,
  DEFAULT_ROOT_URL,
  SUPPORTED_LANGUAGE_CODES
} from '@ghostfolio/common/config';
import { DATE_FORMAT, interpolate } from '@ghostfolio/common/helper';

import { format } from 'date-fns';
import { NextFunction, Request, Response } from 'express';
import * as fs from 'fs';
import { join } from 'path';

const i18nService = new I18nService();

let indexHtmlMap: { [languageCode: string]: string } = {};

const title = 'Ghostfolio';

try {
  indexHtmlMap = SUPPORTED_LANGUAGE_CODES.reduce(
    (map, languageCode) => ({
      ...map,
      [languageCode]: fs.readFileSync(
        join(__dirname, '..', 'client', languageCode, 'index.html'),
        'utf8'
      )
    }),
    {}
  );
} catch {}

const locales = {
  '/de/blog/2023/01/ghostfolio-auf-sackgeld-vorgestellt': {
    featureGraphicPath: 'assets/images/blog/ghostfolio-x-sackgeld.png',
    title: `Ghostfolio auf Sackgeld.com vorgestellt - ${title}`
  },
  '/en/blog/2022/08/500-stars-on-github': {
    featureGraphicPath: 'assets/images/blog/500-stars-on-github.jpg',
    title: `500 Stars - ${title}`
  },
  '/en/blog/2022/10/hacktoberfest-2022': {
    featureGraphicPath: 'assets/images/blog/hacktoberfest-2022.png',
    title: `Hacktoberfest 2022 - ${title}`
  },
  '/en/blog/2022/12/the-importance-of-tracking-your-personal-finances': {
    featureGraphicPath: 'assets/images/blog/20221226.jpg',
    title: `The importance of tracking your personal finances - ${title}`
  },
  '/en/blog/2023/02/ghostfolio-meets-umbrel': {
    featureGraphicPath: 'assets/images/blog/ghostfolio-x-umbrel.png',
    title: `Ghostfolio meets Umbrel - ${title}`
  },
  '/en/blog/2023/03/ghostfolio-reaches-1000-stars-on-github': {
    featureGraphicPath: 'assets/images/blog/1000-stars-on-github.jpg',
    title: `Ghostfolio reaches 1’000 Stars on GitHub - ${title}`
  },
  '/en/blog/2023/05/unlock-your-financial-potential-with-ghostfolio': {
    featureGraphicPath: 'assets/images/blog/20230520.jpg',
    title: `Unlock your Financial Potential with Ghostfolio - ${title}`
  },
  '/en/blog/2023/07/exploring-the-path-to-fire': {
    featureGraphicPath: 'assets/images/blog/20230701.jpg',
    title: `Exploring the Path to FIRE - ${title}`
  },
  '/en/blog/2023/08/ghostfolio-joins-oss-friends': {
    featureGraphicPath: 'assets/images/blog/ghostfolio-joins-oss-friends.png',
    title: `Ghostfolio joins OSS Friends - ${title}`
  },
  '/en/blog/2023/09/ghostfolio-2': {
    featureGraphicPath: 'assets/images/blog/ghostfolio-2.jpg',
    title: `Announcing Ghostfolio 2.0 - ${title}`
  },
  '/en/blog/2023/09/hacktoberfest-2023': {
    featureGraphicPath: 'assets/images/blog/hacktoberfest-2023.png',
    title: `Hacktoberfest 2023 - ${title}`
  },
  '/en/blog/2023/11/black-week-2023': {
    featureGraphicPath: 'assets/images/blog/black-week-2023.jpg',
    title: `Black Week 2023 - ${title}`
  },
  '/en/blog/2023/11/hacktoberfest-2023-debriefing': {
    featureGraphicPath: 'assets/images/blog/hacktoberfest-2023.png',
    title: `Hacktoberfest 2023 Debriefing - ${title}`
  }
};

const isFileRequest = (filename: string) => {
  if (filename === '/assets/LICENSE') {
    return true;
  } else if (
    filename.includes('auth/ey') ||
    filename.includes(
      'personal-finance-tools/open-source-alternative-to-de.fi'
    ) ||
    filename.includes(
      'personal-finance-tools/open-source-alternative-to-markets.sh'
    )
  ) {
    return false;
  }

  return filename.split('.').pop() !== filename;
};

export const HtmlTemplateMiddleware = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  const path = request.originalUrl.replace(/\/$/, '');
  let languageCode = path.substr(1, 2);

  if (!SUPPORTED_LANGUAGE_CODES.includes(languageCode)) {
    languageCode = DEFAULT_LANGUAGE_CODE;
  }

  const currentDate = format(new Date(), DATE_FORMAT);
  const rootUrl = process.env.ROOT_URL || DEFAULT_ROOT_URL;

  if (
    path.startsWith('/api/') ||
    isFileRequest(path) ||
    !environment.production
  ) {
    // Skip
    next();
  } else {
    const indexHtml = interpolate(indexHtmlMap[languageCode], {
      currentDate,
      languageCode,
      path,
      rootUrl,
      description: i18nService.getTranslation({
        languageCode,
        id: 'metaDescription'
      }),
      featureGraphicPath:
        locales[path]?.featureGraphicPath ?? 'assets/cover.png',
      keywords: i18nService.getTranslation({
        languageCode,
        id: 'metaKeywords'
      }),
      title:
        locales[path]?.title ??
        `${title} – ${i18nService.getTranslation({
          languageCode,
          id: 'slogan'
        })}`
    });

    return response.send(indexHtml);
  }
};
