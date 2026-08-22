import { getRequest } from '@ghostfolio/api/helper/execution-context.helper';
import type { RequestWithUser } from '@ghostfolio/common/types';

import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable
} from '@nestjs/common';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

/**
 * Admits a request which is identified by an access instead of by an
 * authenticated user, for example a request of a client of the model context
 * protocol. The access is the bearer token, which is the credential such a
 * client expects and which a token of an authorization server can replace
 * later.
 *
 * The authorization middleware of the endpoint resolves the bearer token
 * before the transport reads the message, because the specification asks for
 * the status 401 and a challenge, which a guard can no longer set. This guard
 * therefore accepts the context of that middleware only. It never accepts the
 * context of the ImpersonationGuard, which comes from the Impersonation-Id
 * header of an authenticated user and is not a bearer token.
 */
@Injectable()
export class AccessGuard implements CanActivate {
  public canActivate(context: ExecutionContext) {
    const request = getRequest<RequestWithUser>(context);

    if (!request?.impersonationOfBearerToken?.isActive) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    request.impersonation = request.impersonationOfBearerToken;

    return true;
  }
}
