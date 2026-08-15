import { ImpersonationService } from '@ghostfolio/api/services/impersonation/impersonation.service';
import { HEADER_KEY_IMPERSONATION } from '@ghostfolio/common/config';
import type { RequestWithUser } from '@ghostfolio/common/types';

import {
  CanActivate,
  ExecutionContext,
  HttpException,
  Injectable
} from '@nestjs/common';
import { StatusCodes, getReasonPhrase } from 'http-status-codes';

/**
 * Resolves the impersonation context of the request. An identifier which
 * cannot be resolved is rejected instead of falling back to the own access, so
 * that a revoked or stale identifier can never present the data of the
 * authenticated user as the data of the impersonated user.
 */
@Injectable()
export class ImpersonationGuard implements CanActivate {
  public constructor(
    private readonly impersonationService: ImpersonationService
  ) {}

  public async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    const impersonationId = request.headers?.[
      HEADER_KEY_IMPERSONATION.toLowerCase()
    ] as string;

    request.impersonation = await this.impersonationService.resolve({
      impersonationId,
      user: request.user
    });

    if (impersonationId && !request.impersonation.isActive) {
      throw new HttpException(
        getReasonPhrase(StatusCodes.FORBIDDEN),
        StatusCodes.FORBIDDEN
      );
    }

    return true;
  }
}
