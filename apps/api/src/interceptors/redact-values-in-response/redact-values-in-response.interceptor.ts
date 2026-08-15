import { redactPaths } from '@ghostfolio/api/helper/object.helper';
import { DEFAULT_REDACTED_PATHS } from '@ghostfolio/common/config';
import { isRestrictedView } from '@ghostfolio/common/permissions';
import { hasScope, scopes } from '@ghostfolio/common/scopes';
import type { RequestWithUser } from '@ghostfolio/common/types';

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class RedactValuesInResponseInterceptor<T> implements NestInterceptor<
  T,
  any
> {
  public intercept(
    context: ExecutionContext,
    next: CallHandler<T>
  ): Observable<any> {
    return next.handle().pipe(
      map((data: any) => {
        const { impersonation, user } = context
          .switchToHttp()
          .getRequest<RequestWithUser>();

        // A missing impersonation context originates from a public request or
        // from a route without the ImpersonationGuard, hence the monetary
        // values are redacted to never expose them unintentionally
        if (
          !hasScope(impersonation?.scopes, scopes.portfolioReadValues) ||
          isRestrictedView(user)
        ) {
          data = redactPaths({
            object: data,
            paths: DEFAULT_REDACTED_PATHS
          });
        }

        return data;
      })
    );
  }
}
