import { ALLOW_DURING_IMPERSONATION_KEY } from '@ghostfolio/api/decorators/allow-during-impersonation.decorator';
import { HEADER_KEY_IMPERSONATION } from '@ghostfolio/common/config';

import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

// Denies modifying requests while an impersonation is active, so that data of
// the authenticated user cannot be changed from a view presenting data of the
// impersonated user. The header is evaluated instead of the resolved context to
// fail closed, also for an identifier which cannot be resolved.
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

    throw new HttpException(
      getReasonPhrase(StatusCodes.FORBIDDEN),
      StatusCodes.FORBIDDEN
    );
  }
}
