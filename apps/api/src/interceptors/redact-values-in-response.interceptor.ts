import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import { UserService } from '@ghostfolio/api/app/user/user.service';
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
  public constructor(private userService: UserService) {}

  public intercept(
    context: ExecutionContext,
    next: CallHandler<T>
  ): Observable<any> {
    return next.handle().pipe(
      map((data: any) => {
        const request = context.switchToHttp().getRequest();
        const hasImpersonationId = !!request.headers?.['impersonation-id'];

        if (
          hasImpersonationId ||
          this.userService.isRestrictedView(request.user)
        ) {
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

              if (activity.comment !== undefined) {
                activity.comment = null;
              }

              if (activity.fee !== undefined) {
                activity.fee = null;
              }

              if (activity.feeInBaseCurrency !== undefined) {
                activity.feeInBaseCurrency = null;
              }

              if (activity.quantity !== undefined) {
                activity.quantity = null;
              }

              if (activity.unitPrice !== undefined) {
                activity.unitPrice = null;
              }

              if (activity.value !== undefined) {
                activity.value = null;
              }

              if (activity.valueInBaseCurrency !== undefined) {
                activity.valueInBaseCurrency = null;
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
