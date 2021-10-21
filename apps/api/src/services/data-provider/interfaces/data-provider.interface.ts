import { LookupItem } from '@ghostfolio/api/app/symbol/interfaces/lookup-item.interface';
import { Granularity } from '@ghostfolio/common/types';
import { DataSource } from '@prisma/client';

import {
  IDataProviderHistoricalResponse,
  IDataProviderResponse
} from '../../interfaces/interfaces';

export interface DataProviderInterface {
  canHandle(symbol: string): boolean;

  get(aSymbols: string[]): Promise<{ [symbol: string]: IDataProviderResponse }>;

  getHistorical(
    aSymbols: string[],
    aGranularity: Granularity,
    from: Date,
    to: Date
  ): Promise<{
    [symbol: string]: { [date: string]: IDataProviderHistoricalResponse };
  }>;

  getName(): DataSource;

  search(aSymbol: string): Promise<{ items: LookupItem[] }>;
}
