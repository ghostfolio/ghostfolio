import * as fs from 'fs';

import { NextFunction, Request, Response } from 'express';
import { join } from 'path';
import { DATE_FORMAT, interpolate } from '@ghostfolio/common/helper';
import { environment } from '@ghostfolio/api/environments/environment';
import { SUPPORTED_LANGUAGE_CODES } from '@ghostfolio/common/config';
import { format } from 'date-fns';

const title = 'Ghostfolio – Open Source Wealth Management Software';

// TODO
const descriptions = {
  en: 'Ghostfolio is a personal finance dashboard to keep track of your assets like stocks, ETFs or cryptocurrencies across multiple platforms.'
};

// TODO
const locales = {
  '/en/blog/2022/08/500-stars-on-github': {
    featureGraphicPath: 'assets/images/blog/500-stars-on-github.jpg',
    title: `500 Stars - ${title}`
  }
};

const getPathOfIndexHtmlFile = (aLocale: string) => {
  return join(__dirname, '..', 'client', aLocale, 'index.html');
};

const isFileRequest = (filename: string) => {
  if (filename === '/assets/LICENSE') {
    return true;
  } else if (
    filename.includes('auth/ey') ||
    filename.includes(
      'personal-finance-tools/open-source-alternative-to-markets.sh'
    )
  ) {
    return false;
  }

  return filename.split('.').pop() !== filename;
};

export const StaticMiddleware = async (
  request: Request,
  response: Response,
  next: NextFunction
) => {
  const path = request.originalUrl.replace(/\/$/, '');
  const languageCode = path.substr(1, 2);

  const currentDate = format(new Date(), DATE_FORMAT);
  const rootUrl = 'https://ghostfol.io';

  if (
    path.startsWith('/api/') ||
    isFileRequest(path) /*||
    !environment.production*/
  ) {
    // Skip
    next();
  } else if (SUPPORTED_LANGUAGE_CODES.includes(languageCode)) {
    // TODO: Only load once
    const indexHtml = interpolate(
      fs.readFileSync(getPathOfIndexHtmlFile(languageCode), 'utf8'),
      {
        currentDate,
        languageCode,
        path,
        rootUrl,
        description: descriptions[languageCode],
        featureGraphicPath:
          locales[path]?.featureGraphicPath ?? 'assets/cover.png',
        title: locales[path]?.title ?? title
      }
    );

    return response.send(indexHtml);
  } else {
    // TODO
  }
};
