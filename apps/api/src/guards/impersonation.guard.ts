import { ImpersonationService } from '@ghostfolio/api/services/impersonation/impersonation.service';
import { HEADER_KEY_IMPERSONATION } from '@ghostfolio/common/config';
import type { RequestWithUser } from '@ghostfolio/common/types';

import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class ImpersonationGuard implements CanActivate {
  public constructor(
    private readonly impersonationService: ImpersonationService
  ) {}

  public async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    request.impersonation = await this.impersonationService.resolve({
      impersonationId: request.headers?.[
        HEADER_KEY_IMPERSONATION.toLowerCase()
      ] as string,
      user: request.user
    });

    return true;
  }
}
