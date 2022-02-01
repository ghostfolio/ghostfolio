import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from '@nestjs/common';
import { DataSource } from '@prisma/client';
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
              activity.SymbolProfile.dataSource = this.encodeDataSource(
                activity.SymbolProfile.dataSource
              );
              activity.dataSource = this.encodeDataSource(activity.dataSource);
              return activity;
            });
          }

          if (data.dataSource) {
            data.dataSource = this.encodeDataSource(data.dataSource);
          }

          if (data.holdings) {
            for (const symbol of Object.keys(data.holdings)) {
              if (data.holdings[symbol].dataSource) {
                data.holdings[symbol].dataSource = this.encodeDataSource(
                  data.holdings[symbol].dataSource
                );
              }
            }
          }

          if (data.items) {
            data.items.map((item) => {
              item.dataSource = this.encodeDataSource(item.dataSource);
              return item;
            });
          }

          if (data.positions) {
            data.positions.map((position) => {
              position.dataSource = this.encodeDataSource(position.dataSource);
              return position;
            });
          }
        }

        return data;
      })
    );
  }

  private encodeDataSource(aDataSource: DataSource) {
    return Buffer.from(aDataSource, 'utf-8').toString('hex');
  }
}
