import { ALLOW_DURING_IMPERSONATION_KEY } from '@ghostfolio/api/decorators/allow-during-impersonation.decorator';
import { REQUIRES_SCOPE_KEY } from '@ghostfolio/api/decorators/requires-scope.decorator';
import { HEADER_KEY_IMPERSONATION } from '@ghostfolio/common/config';
import { SCOPES_OF_WRITE_ACCESS, Scope } from '@ghostfolio/common/scopes';

import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

/**
 * Blocks write requests while an impersonation is active, so that data of the
 * authenticated user cannot be changed from a view presenting data of the
 * impersonated user. The header is evaluated instead of the resolved context to
 * fail closed, also for an identifier which cannot be resolved.
 *
 * A route which declares a write scope is left to the ScopeGuard, which
 * evaluates the resolved context. This guard is global, hence it runs before
 * the guards of the route and cannot read the context itself. A route which
 * declares read scopes only is still blocked here, so that a read access can
 * never reach a handler which changes data.
 */
@Injectable()
export class ImpersonationWriteGuard implements CanActivate {
  public constructor(private readonly reflector: Reflector) {}

  public canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    if (request.method === 'GET') {
      return true;
    }

    if (!request.headers?.[HEADER_KEY_IMPERSONATION.toLowerCase()]) {
      return true;
    }

    const isAllowedDuringImpersonation =
      this.reflector.getAllAndOverride<boolean>(
        ALLOW_DURING_IMPERSONATION_KEY,
        [context.getHandler(), context.getClass()]
      );

    if (isAllowedDuringImpersonation) {
      return true;
    }

    const requiredScopes = this.reflector.getAllAndOverride<Scope[]>(
      REQUIRES_SCOPE_KEY,
      [context.getHandler(), context.getClass()]
    );

    const requiresWriteScope = requiredScopes?.some((scope) => {
      return SCOPES_OF_WRITE_ACCESS.includes(scope);
    });

    if (requiresWriteScope) {
      return true;
    }

    throw new HttpException(
      getReasonPhrase(StatusCodes.FORBIDDEN),
      StatusCodes.FORBIDDEN
    );
  }
}
