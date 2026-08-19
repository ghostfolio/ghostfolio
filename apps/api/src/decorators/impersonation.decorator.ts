import type {
  ImpersonationContext,
  RequestWithUser
} from '@ghostfolio/common/types';

import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException
} from '@nestjs/common';

/**
 * Provides the impersonation context of the request, which the
 * ImpersonationGuard resolves. A missing context is a mistake in the setup of
 * the route and fails loudly, because a fallback to the own access would let a
 * handler change data without any scope being evaluated.
 */
export const Impersonation = createParamDecorator(
  (_data: unknown, context: ExecutionContext): ImpersonationContext => {
    const { impersonation } = context
      .switchToHttp()
      .getRequest<RequestWithUser>();

    if (!impersonation) {
      throw new InternalServerErrorException(
        'The impersonation context is missing. Apply the RequiresScope decorator or the ImpersonationGuard to the route.'
      );
    }

    return impersonation;
  }
);
