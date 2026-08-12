import { REQUIRES_SCOPE_KEY } from '@ghostfolio/api/decorators/requires-scope.decorator';
import { hasScope } from '@ghostfolio/common/scopes';
import type { RequestWithUser } from '@ghostfolio/common/types';

import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

/**
 * Denies a request whose impersonation context does not cover the scopes
 * required by the route. It has to be applied after the ImpersonationGuard,
 * which resolves the context.
 */
@Injectable()
export class ScopeGuard implements CanActivate {
  public constructor(private readonly reflector: Reflector) {}

  public canActivate(context: ExecutionContext): boolean {
    const requiredScopes = this.reflector.getAllAndOverride<string[]>(
      REQUIRES_SCOPE_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredScopes?.length) {
      return true;
    }

    const { impersonation } = context
      .switchToHttp()
      .getRequest<RequestWithUser>();

    const hasRequiredScopes = requiredScopes.every((scope) => {
      return hasScope(impersonation?.scopes, scope);
    });

    if (!hasRequiredScopes) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return true;
  }
}
