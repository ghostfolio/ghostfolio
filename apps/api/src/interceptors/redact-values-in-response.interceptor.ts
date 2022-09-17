import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
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
  public constructor() {}

  public intercept(
    context: ExecutionContext,
    next: CallHandler<T>
  ): Observable<any> {
    return next.handle().pipe(
      map((data: any) => {
        const request = context.switchToHttp().getRequest();
        const hasImpersonationId = !!request.headers?.['impersonation-id'];

        if (hasImpersonationId) {
          if (data.accounts) {
            for (const accountId of Object.keys(data.accounts)) {
              if (data.accounts[accountId]?.balance !== undefined) {
                data.accounts[accountId].balance = null;
              }
            }
          }

          if (data.activities) {
            data.activities = data.activities.map((activity: Activity) => {
              if (activity.Account?.balance !== undefined) {
                activity.Account.balance = null;
              }

              return activity;
            });
          }

          if (data.filteredValueInBaseCurrency) {
            data.filteredValueInBaseCurrency = null;
          }

          if (data.totalValueInBaseCurrency) {
            data.totalValueInBaseCurrency = null;
          }
        }

        return data;
      })
    );
  }
}
