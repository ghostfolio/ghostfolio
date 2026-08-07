import { environment } from '@ghostfolio/api/environments/environment';
import {
  DEFAULT_LANGUAGE_CODE,
  SUPPORTED_LANGUAGE_CODES
} from '@ghostfolio/common/config';

import { NextFunction, Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

export function languageRedirectMiddleware(
  request: Request,
  response: Response,
  next: NextFunction
) {
  if (
    !environment.production ||
    request.path !== '/' ||
    !['GET', 'HEAD'].includes(request.method)
  ) {
    return next();
  }

  let languageCode = DEFAULT_LANGUAGE_CODE;

  try {
    const code = request.headers['accept-language'].split(',')[0].split('-')[0];

    if ((SUPPORTED_LANGUAGE_CODES as readonly string[]).includes(code)) {
      languageCode = code;
    }
  } catch {}

  return response.redirect(
    StatusCodes.MOVED_PERMANENTLY,
    `/${languageCode}${request.url.slice(1)}`
  );
}
