import { UserService } from '@ghostfolio/api/app/user/user.service';
import { redactAttributes } from '@ghostfolio/api/helper/object.helper';
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
              'filteredValueInBaseCurrency',
              'grossPerformance',
              'investment',
              'netPerformance',
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
