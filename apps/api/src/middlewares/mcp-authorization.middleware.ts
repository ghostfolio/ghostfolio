import type { UserService } from '@ghostfolio/api/app/user/user.service';
import { getAccessIdOfBearerToken } from '@ghostfolio/api/helper/bearer-token.helper';
import type { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import type { ImpersonationService } from '@ghostfolio/api/services/impersonation/impersonation.service';
import { HEADER_KEY_TOKEN, MCP_REALM } from '@ghostfolio/common/config';
import { hasRole } from '@ghostfolio/common/permissions';
import type { ImpersonationContext } from '@ghostfolio/common/types';

import { RequestClient } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { getReasonPhrase, StatusCodes } from 'http-status-codes';

/**
 * Authenticates a request of a client of the model context protocol before the
 * transport reads it. The specification tells a server to answer an
 * unauthorized request with the status 401 and a challenge, hence the answer
 * cannot come from a guard: a guard runs while the transport dispatches the
 * message and can no longer set the status of the response.
 *
 * The challenge names no resource metadata, because Ghostfolio has no
 * authorization server. A client which reads the challenge asks the user for
 * the identifier of the access instead of starting a flow which would fail.
 *
 * With the subscription, the user who granted the access has the same limits
 * as with the other clients: an inactive user and a user who exceeds the daily
 * request limit get the status 429, which also has to come from here.
 *
 * An authorized request is counted in the analytics of the user who granted
 * the access, as the strategies do for the requests of the other clients.
 */
export function createMcpAuthorizationMiddleware({
  configurationService,
  impersonationService,
  userService
}: {
  configurationService: ConfigurationService;
  impersonationService: ImpersonationService;
  userService: UserService;
}) {
  return async (
    request: Request & { impersonationOfBearerToken?: ImpersonationContext },
    response: Response,
    next: NextFunction
  ) => {
    const accessId = getAccessIdOfBearerToken(
      request.headers[HEADER_KEY_TOKEN.toLowerCase()] as string
    );

    const impersonation = await impersonationService.resolve({
      impersonationId: accessId,
      types: ['MCP']
    });

    if (!impersonation.isActive) {
      return sendUnauthorizedResponse({ accessId, response });
    }

    if (configurationService.get('ENABLE_FEATURE_SUBSCRIPTION')) {
      const user = await userService.user({ id: impersonation.userId });

      if (!user) {
        return sendUnauthorizedResponse({ accessId, response });
      }

      const isRequestLimitExceeded =
        hasRole(user, 'INACTIVE') ||
        (await userService.isDailyRequestLimitExceeded({ user }));

      if (isRequestLimitExceeded) {
        return response.status(StatusCodes.TOO_MANY_REQUESTS).json({
          error: getReasonPhrase(StatusCodes.TOO_MANY_REQUESTS),
          message:
            'The request limit of the user who granted the access is exceeded'
        });
      }

      await userService.updateAnalytics({
        requestClient: RequestClient.MCP,
        userId: impersonation.userId
      });
    }

    // The guard of the route reads the resolved context from the same request,
    // hence the access is looked up once
    request.impersonationOfBearerToken = impersonation;

    return next();
  };
}

function sendUnauthorizedResponse({
  accessId,
  response
}: {
  accessId: string;
  response: Response;
}) {
  const parameters = [`realm="${MCP_REALM}"`];

  if (accessId) {
    parameters.push(
      'error="invalid_token"',
      'error_description="The access cannot be resolved"'
    );
  }

  response.setHeader('WWW-Authenticate', `Bearer ${parameters.join(', ')}`);

  return response.status(StatusCodes.UNAUTHORIZED).json({
    error: getReasonPhrase(StatusCodes.UNAUTHORIZED),
    message: 'A valid access is required as a bearer token'
  });
}
