import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { decodeDataSource } from '@ghostfolio/common/helper';

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from '@nestjs/common';
import { DataSource } from '@prisma/client';
import { Observable } from 'rxjs';

@Injectable()
export class TransformDataSourceInRequestInterceptor<T>
  implements NestInterceptor<T, any>
{
  public constructor(
    private readonly configurationService: ConfigurationService
  ) {}

  public intercept(
    context: ExecutionContext,
    next: CallHandler<T>
  ): Observable<any> {
    const http = context.switchToHttp();
    const request = http.getRequest();

    if (this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION')) {
      if (request.body?.activities) {
        request.body.activities = request.body.activities.map((activity) => {
          if (DataSource[activity.dataSource]) {
            return activity;
          } else {
            return {
              ...activity,
              dataSource: decodeDataSource(activity.dataSource)
            };
          }
        });
      }

      for (const type of ['body', 'params', 'query']) {
        const dataSourceValue = request[type]?.dataSource;

        if (dataSourceValue && !DataSource[dataSourceValue]) {
          // In Express 5, request.query is read-only, so request[type].dataSource cannot be directly modified
          Object.defineProperty(request, type, {
            configurable: true,
            enumerable: true,
            value: {
              ...request[type],
              dataSource: decodeDataSource(dataSourceValue)
            },
            writable: true
          });
        }
      }
    }

    return next.handle();
  }
}
