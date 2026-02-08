import { redactPaths } from '@ghostfolio/api/helper/object.helper';
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
export class TransformDataSourceInResponseInterceptor<
  T
> implements NestInterceptor<T, any> {
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
    context: ExecutionContext,
    next: CallHandler<T>
  ): Observable<any> {
    const isExportMode = context.getClass().name === 'ExportController';

    return next.handle().pipe(
      map((data: any) => {
        if (this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION')) {
          const valueMap = this.encodedDataSourceMap;

          if (isExportMode) {
            for (const dataSource of this.configurationService.get(
              'DATA_SOURCES_GHOSTFOLIO_DATA_PROVIDER'
            )) {
              valueMap[dataSource] = 'GHOSTFOLIO';
            }
          }

          data = redactPaths({
            valueMap,
            object: data,
            paths: [
              'activities[*].SymbolProfile.dataSource',
              'benchmarks[*].dataSource',
              'fearAndGreedIndex.CRYPTOCURRENCIES.dataSource',
              'fearAndGreedIndex.STOCKS.dataSource',
              'holdings[*].dataSource',
              'items[*].dataSource',
              'SymbolProfile.dataSource',
              'watchlist[*].dataSource'
            ]
          });
        }

        return data;
      })
    );
  }
}
