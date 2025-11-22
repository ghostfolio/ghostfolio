import { redactAttributes } from '@ghostfolio/api/helper/object.helper';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { encodeDataSource } from '@ghostfolio/common/helper';

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor
} from '@nestjs/common';
import { DataSource } from '@prisma/client';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformDataSourceInResponseInterceptor<T>
  implements NestInterceptor<T, any>
{
  private encodedDataSourceMap: {
    [dataSource: string]: string;
  } = {};

  public constructor(
    private readonly configurationService: ConfigurationService
  ) {
    if (this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION')) {
      this.encodedDataSourceMap = Object.keys(DataSource).reduce(
        (encodedDataSourceMap, dataSource) => {
          if (!['GHOSTFOLIO', 'MANUAL'].includes(dataSource)) {
            encodedDataSourceMap[dataSource] = encodeDataSource(
              DataSource[dataSource]
            );
          }

          return encodedDataSourceMap;
        },
        {}
      );
    }
  }

  public intercept(
    _context: ExecutionContext,
    next: CallHandler<T>
  ): Observable<any> {
    return next.handle().pipe(
      map((data: any) => {
        if (this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION')) {
          data = redactAttributes({
            options: [
              {
                attribute: 'dataSource',
                valueMap: this.encodedDataSourceMap
              }
            ],
            object: data
          });
        }

        return data;
      })
    );
  }
}
