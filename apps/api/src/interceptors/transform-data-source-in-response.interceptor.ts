import { encodeDataSource } from '@ghostfolio/common/helper';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { ConfigurationService } from '../services/configuration.service';

@Injectable()
export class TransformDataSourceInResponseInterceptor<T>
  implements NestInterceptor<T, any>
{
  public constructor(
    private readonly configurationService: ConfigurationService
  ) {}

  public intercept(
    context: ExecutionContext,
    next: CallHandler<T>
  ): Observable<any> {
    return next.handle().pipe(
      map((data: any) => {
        if (
          this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION') === true
        ) {
          if (data.activities) {
            data.activities.map((activity) => {
              activity.SymbolProfile.dataSource = encodeDataSource(
                activity.SymbolProfile.dataSource
              );
              activity.dataSource = encodeDataSource(activity.dataSource);
              return activity;
            });
          }

          if (data.dataSource) {
            data.dataSource = encodeDataSource(data.dataSource);
          }

          if (data.holdings) {
            for (const symbol of Object.keys(data.holdings)) {
              if (data.holdings[symbol].dataSource) {
                data.holdings[symbol].dataSource = encodeDataSource(
                  data.holdings[symbol].dataSource
                );
              }
            }
          }

          if (data.items) {
            data.items.map((item) => {
              item.dataSource = encodeDataSource(item.dataSource);
              return item;
            });
          }

          if (data.orders) {
            data.orders.map((order) => {
              order.dataSource = encodeDataSource(order.dataSource);
              return order;
            });
          }

          if (data.positions) {
            data.positions.map((position) => {
              position.dataSource = encodeDataSource(position.dataSource);
              return position;
            });
          }

          if (data.SymbolProfile) {
            data.SymbolProfile.dataSource = encodeDataSource(
              data.SymbolProfile.dataSource
            );
          }
        }

        return data;
      })
    );
  }
}
