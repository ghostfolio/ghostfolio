import { environment } from '@ghostfolio/api/environments/environment';
import { getLanguageCodeFromHeader } from '@ghostfolio/api/helper/language.helper';

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

  const languageCode = getLanguageCodeFromHeader(
    request.headers['accept-language']
  );

  return response.redirect(
    StatusCodes.MOVED_PERMANENTLY,
    `/${languageCode}${request.url.slice(1)}`
  );
}
