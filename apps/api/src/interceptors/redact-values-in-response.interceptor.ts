import { UserService } from '@ghostfolio/api/app/user/user.service';
import { redactAttributes } from '@ghostfolio/api/helper/object.helper';
import { HEADER_KEY_IMPERSONATION } from '@ghostfolio/common/config';
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
        const hasImpersonationId =
          !!request.headers?.[HEADER_KEY_IMPERSONATION.toLowerCase()];

        if (
          hasImpersonationId ||
          this.userService.isRestrictedView(request.user)
        ) {
          const attributes = [
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
          ];

          console.time('oldExecutionTime');

          data = redactAttributes({
            object: data,
            options: attributes.map((attribute) => {
              return {
                attribute,
                valueMap: {
                  '*': null
                }
              };
            })
          });

          console.timeLog('oldExecutionTime');

          data = this.redactObject({
            attributes,
            data,
            valueMap: {
              '*': null
            }
          });
        }

        return data;
      })
    );
  }

  private redactObject({
    attributes,
    data,
    valueMap
  }: {
    attributes: string[];
    data: any;
    valueMap: { [key: string]: any };
  }) {
    console.time('newExecutionTime');

    // Stringify the JSON object
    let jsonString = JSON.stringify(data);

    // Nullify occurrences of attributes in the string
    for (const attribute of attributes) {
      const regex = new RegExp(`"${attribute}"\\s*:\\s*"[^"]*"`, 'g');

      if (valueMap['*'] || valueMap['*'] === null) {
        jsonString = jsonString.replace(
          regex,
          `"${attribute}":${valueMap['*']}`
        );
      } else if (valueMap[attribute]) {
        jsonString = jsonString.replace(
          regex,
          `"${attribute}":${valueMap[attribute]}`
        );
      }
    }

    // Transform the stringified JSON back to an object
    const transformedObject = JSON.parse(jsonString);

    console.timeLog('newExecutionTime');

    return transformedObject;
  }
}
