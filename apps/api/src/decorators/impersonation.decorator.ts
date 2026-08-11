import type {
  ImpersonationContext,
  RequestWithUser
} from '@ghostfolio/common/types';

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Provides the impersonation context of the request, which requires the
 * ImpersonationGuard to be applied to the route
 */
export const Impersonation = createParamDecorator(
  (_data: unknown, context: ExecutionContext): ImpersonationContext => {
    const { impersonation, user } = context
      .switchToHttp()
      .getRequest<RequestWithUser>();

    return (
      impersonation ?? {
        isActive: false,
        userId: user?.id,
        userSettings: user?.settings?.settings ?? {}
      }
    );
  }
);
