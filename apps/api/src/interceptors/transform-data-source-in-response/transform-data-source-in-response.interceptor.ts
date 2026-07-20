import {
  encodeDataSource,
  getMaskedGhostfolioDataSource
} from '@ghostfolio/api/helper/data-source.helper';
import { redactPaths } from '@ghostfolio/api/helper/object.helper';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { hasRole } from '@ghostfolio/common/permissions';

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
    const { user } = context.switchToHttp().getRequest();

    return next.handle().pipe(
      map((data: any) => {
        if (this.configurationService.get('ENABLE_FEATURE_SUBSCRIPTION')) {
          const valueMap = hasRole(user, 'ADMIN')
            ? {}
            : { ...this.encodedDataSourceMap };

          if (isExportMode) {
            const ghostfolioDataSources = this.configurationService.get(
              'DATA_SOURCES_GHOSTFOLIO_DATA_PROVIDER'
            ) as DataSource[];

            for (const dataSource of ghostfolioDataSources) {
              valueMap[dataSource] = getMaskedGhostfolioDataSource({
                dataSource,
                ghostfolioDataSources
              });
            }
          }

          if (Object.keys(valueMap).length === 0) {
            return data;
          }

          data = redactPaths({
            valueMap,
            object: data,
            paths: [
              'activities[*].assetProfile.dataSource',
              'activities[*].dataSource',
              'assetProfile.dataSource',
              'benchmarks[*].dataSource',
              'errors[*].dataSource',
              'fearAndGreedIndex.CRYPTOCURRENCIES.dataSource',
              'fearAndGreedIndex.STOCKS.dataSource',
              'holdings[*].assetProfile.dataSource',
              'holdings[*].dataSource',
              'items[*].dataSource',
              'watchlist[*].dataSource'
            ]
          });
        }

        return data;
      })
    );
  }
}
