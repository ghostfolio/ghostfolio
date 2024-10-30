import { redactAttributes } from '@ghostfolio/api/helper/object.helper';
import { HEADER_KEY_IMPERSONATION } from '@ghostfolio/common/config';
import {
  hasReadRestrictedAccessPermission,
  isRestrictedView
} from '@ghostfolio/common/permissions';
import { UserWithSettings } from '@ghostfolio/common/types';

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class RedactValuesInResponseInterceptor<T>
  implements NestInterceptor<T, any>
{
  public intercept(
    context: ExecutionContext,
    next: CallHandler<T>
  ): Observable<any> {
    return next.handle().pipe(
      map((data: any) => {
        const { headers, user }: { headers: Headers; user: UserWithSettings } =
          context.switchToHttp().getRequest();

        const impersonationId =
          headers?.[HEADER_KEY_IMPERSONATION.toLowerCase()];

        if (
          hasReadRestrictedAccessPermission({
            impersonationId,
            user
          }) ||
          isRestrictedView(user)
        ) {
          data = redactAttributes({
            object: data,
            options: [
              'balance',
              'balanceInBaseCurrency',
              'comment',
              'convertedBalance',
              'dividendInBaseCurrency',
              'fee',
              'feeInBaseCurrency',
              'grossPerformance',
              'grossPerformanceWithCurrencyEffect',
              'investment',
              'netPerformance',
              'netPerformanceWithCurrencyEffect',
              'quantity',
              'symbolMapping',
              'totalBalanceInBaseCurrency',
              'totalValueInBaseCurrency',
              'unitPrice',
              'value',
              'valueInBaseCurrency'
            ].map((attribute) => {
              return {
                attribute,
                valueMap: {
                  '*': null
                }
              };
            })
          });
        }

        return data;
      })
    );
  }
}
