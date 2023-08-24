import * as fs from 'fs';
import { join } from 'path';

import { environment } from '@ghostfolio/api/environments/environment';
import {
  DEFAULT_LANGUAGE_CODE,
  DEFAULT_ROOT_URL,
  SUPPORTED_LANGUAGE_CODES
} from '@ghostfolio/common/config';
import { DATE_FORMAT, interpolate } from '@ghostfolio/common/helper';
import { format } from 'date-fns';
import { NextFunction, Request, Response } from 'express';

const descriptions = {
  de: 'Mit dem Finanz-Dashboard Ghostfolio können Sie Ihr Vermögen in Form von Aktien, ETFs oder Kryptowährungen verteilt über mehrere Finanzinstitute überwachen.',
  en: 'Ghostfolio is a personal finance dashboard to keep track of your assets like stocks, ETFs or cryptocurrencies across multiple platforms.',
  es: 'Ghostfolio es un dashboard de finanzas personales para hacer un seguimiento de tus activos como acciones, ETFs o criptodivisas a través de múltiples plataformas.',
  fr: 'Ghostfolio est un dashboard de finances personnelles qui permet de suivre vos actifs comme les actions, les ETF ou les crypto-monnaies sur plusieurs plateformes.',
  it: 'Ghostfolio è un dashboard di finanza personale per tenere traccia delle vostre attività come azioni, ETF o criptovalute su più piattaforme.',
  nl: 'Ghostfolio is een persoonlijk financieel dashboard om uw activa zoals aandelen, ETF’s of cryptocurrencies over meerdere platforms bij te houden.',
  pt: 'Ghostfolio é um dashboard de finanças pessoais para acompanhar os seus activos como acções, ETFs ou criptomoedas em múltiplas plataformas.'
};

const title = 'Ghostfolio – Open Source Wealth Management Software';
const titleShort = 'Ghostfolio';

let indexHtmlMap: { [languageCode: string]: string } = {};

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
    title: `Ghostfolio auf Sackgeld.com vorgestellt - ${titleShort}`
  },
  '/en/blog/2022/08/500-stars-on-github': {
    featureGraphicPath: 'assets/images/blog/500-stars-on-github.jpg',
    title: `500 Stars - ${titleShort}`
  },
  '/en/blog/2022/10/hacktoberfest-2022': {
    featureGraphicPath: 'assets/images/blog/hacktoberfest-2022.png',
    title: `Hacktoberfest 2022 - ${titleShort}`
  },
  '/en/blog/2022/12/the-importance-of-tracking-your-personal-finances': {
    featureGraphicPath: 'assets/images/blog/20221226.jpg',
    title: `The importance of tracking your personal finances - ${titleShort}`
  },
  '/en/blog/2023/02/ghostfolio-meets-umbrel': {
    featureGraphicPath: 'assets/images/blog/ghostfolio-x-umbrel.png',
    title: `Ghostfolio meets Umbrel - ${titleShort}`
  },
  '/en/blog/2023/03/ghostfolio-reaches-1000-stars-on-github': {
    featureGraphicPath: 'assets/images/blog/1000-stars-on-github.jpg',
    title: `Ghostfolio reaches 1’000 Stars on GitHub - ${titleShort}`
  },
  '/en/blog/2023/05/unlock-your-financial-potential-with-ghostfolio': {
    featureGraphicPath: 'assets/images/blog/20230520.jpg',
    title: `Unlock your Financial Potential with Ghostfolio - ${titleShort}`
  },
  '/en/blog/2023/07/exploring-the-path-to-fire': {
    featureGraphicPath: 'assets/images/blog/20230701.jpg',
    title: `Exploring the Path to FIRE - ${titleShort}`
  },
  '/en/blog/2023/08/ghostfolio-joins-oss-friends': {
    featureGraphicPath: 'assets/images/blog/ghostfolio-joins-oss-friends.png',
    title: `Ghostfolio joins OSS Friends - ${titleShort}`
  }
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
      description: descriptions[languageCode],
      featureGraphicPath:
        locales[path]?.featureGraphicPath ?? 'assets/cover.png',
      title: locales[path]?.title ?? title
    });

    return response.send(indexHtml);
  }
};
