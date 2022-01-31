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
              activity.dataSource = this.encodeDataSource(activity.dataSource);
              return activity;
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
